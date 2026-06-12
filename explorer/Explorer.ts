import * as fs from 'fs';
import * as path from 'path';
import { Injector } from '../engine';
import { TestContext } from '../engine/test.context';
import { ActionExecutor, computeDomChanges } from './ActionExecutor';
import { DOMExtractor } from './DOMExtractor';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationGraph } from './ExplorationGraph';
import { ExplorationScope } from './ExplorationScope';
import { ReadinessChecker } from './ReadinessChecker';
import { RulesEngine } from './RulesEngine';
import { StateManager } from './StateManager';
import { CandidateAction, DomChanges, getTargetUid, StateNode } from './types';

export type ExplorationSummary = {
  statesDiscovered: number;
  transitions: number;
  maxDepthReached: number;
  cycles: number;
  deadEnds: number;
  totalDuration: number;
  failedActions: number;
};

export abstract class Explorer {
  abstract explore(): Promise<ExplorationGraph>;
  abstract getSummary(): ExplorationSummary;
  abstract get graph(): ExplorationGraph;
}

@Injector({
  Provide: [TestContext, ExplorationScope, DOMExtractor, RulesEngine, ActionExecutor, StateManager, ExplorationGraph, ExplorationConfig, ReadinessChecker],
})
export class ConcreteExplorer extends Explorer {
  readonly #page;
  readonly #extractor: DOMExtractor;
  readonly #rulesEngine: RulesEngine;
  readonly #executor: ActionExecutor;
  readonly #stateManager: StateManager;
  readonly #graph: ExplorationGraph;
  readonly #config: ExplorationConfig;
  readonly #readiness: ReadinessChecker;
  /** URL to replay (via goto) to restore each discovered state during rollback. */
  readonly #stateUrls = new Map<string, string>();
  #failedActions = 0;
  #startTime = 0;
  #transitionCounter = 0;

  constructor(
    testContext: TestContext,
    _explorationScope: ExplorationScope, // injected to ensure scope is initialized before DOMExtractor
    domExtractor: DOMExtractor,
    rulesEngine: RulesEngine,
    actionExecutor: ActionExecutor,
    stateManager: StateManager,
    explorationGraph: ExplorationGraph,
    explorationConfig: ExplorationConfig,
    readinessChecker: ReadinessChecker
  ) {
    super();
    this.#page = testContext.page;
    this.#extractor = domExtractor;
    this.#rulesEngine = rulesEngine;
    this.#executor = actionExecutor;
    this.#stateManager = stateManager;
    this.#graph = explorationGraph;
    this.#config = explorationConfig;
    this.#readiness = readinessChecker;
  }

  get graph(): ExplorationGraph {
    return this.#graph;
  }

  async explore(): Promise<ExplorationGraph> {
    this.#startTime = Date.now();
    this.#failedActions = 0;
    this.#transitionCounter = 0;
    this.#stateUrls.clear();

    const initialState = await this.#captureInitialState();
    const frontier: StateNode[] = [initialState];

    while (frontier.length > 0 && !this.#isTimedOut()) {
      const currentState = this.#takeNext(frontier);

      if (this.#hasReachedMaxStates()) break;
      if (currentState.depth >= this.#config.maxDepth) continue;

      for (const action of await this.#unexploredActions(currentState)) {
        if (this.#isTimedOut() || this.#hasReachedMaxStates()) break;
        await this.#exploreAction(currentState, action, frontier);
      }
    }

    return this.#graph;
  }

  getSummary(): ExplorationSummary {
    const stats = this.#graph.getStats();
    return {
      statesDiscovered: stats.states,
      transitions: stats.transitions,
      maxDepthReached: stats.maxDepth,
      cycles: stats.cycles,
      deadEnds: stats.deadEnds,
      totalDuration: Date.now() - this.#startTime,
      failedActions: this.#failedActions,
    };
  }

  async #captureInitialState(): Promise<StateNode> {
    await this.#readiness.waitForReady();

    const facts = await this.#extractor.extract();
    const state = this.#stateManager.captureState(facts, 0, this.#config.rootSelector);
    this.#stateManager.registerState(state);
    this.#graph.addState(state);
    this.#stateUrls.set(state.id, this.#page.url());
    await this.#captureScreenshot('state', state.id);
    return state;
  }

  /** Executes one candidate action from `currentState` and records the outcome in the graph. */
  async #exploreAction(currentState: StateNode, action: CandidateAction, frontier: StateNode[]): Promise<void> {
    const result = await this.#executor.execute(action);
    await this.#captureScreenshot('transition', this.#actionLabel(action));

    // A navigation can surface as a success OR as a failure (element detached mid-action).
    if (this.#navigatedAwayFrom(currentState)) {
      this.#recordExternalNavigation(currentState, action, result.duration);
      await this.#rollbackToState(currentState);
      return;
    }

    if (!result.success) {
      this.#failedActions++;
      return;
    }

    const newFacts = await this.#extractor.extract();
    const newState = this.#stateManager.captureState(newFacts, currentState.depth + 1, this.#config.rootSelector);
    const domChanges = computeDomChanges(currentState.facts, newFacts);

    if (newState.id === currentState.id) {
      this.#recordSelfLoop(currentState, action, result.duration, domChanges);
    } else {
      await this.#recordDiscovery(currentState, newState, action, result.duration, domChanges, frontier);
    }
    await this.#rollbackToState(currentState);
  }

  /** Boundary transition to a foreign page — recorded without extracting facts from it. */
  #recordExternalNavigation(from: StateNode, action: CandidateAction, duration: number): void {
    this.#graph.addTransition({
      id: `${from.id}->nav:${action.type}:${getTargetUid(action)}`,
      from: from.id,
      to: '__external_navigation__',
      action,
      success: true,
      duration,
      domChanges: { appeared: [], disappeared: [], modified: [] },
      navigationUrl: this.#page.url(),
    });
  }

  /** Self-loops are kept so visual regression tests can replay hover/focus/mousedown actions. */
  #recordSelfLoop(state: StateNode, action: CandidateAction, duration: number, domChanges: DomChanges): void {
    this.#graph.addTransition({
      id: `${state.id}->${state.id}:${action.type}:${getTargetUid(action)}`,
      from: state.id,
      to: state.id,
      action,
      success: true,
      duration,
      domChanges,
      selfLoop: true,
    });
  }

  async #recordDiscovery(from: StateNode, to: StateNode, action: CandidateAction, duration: number, domChanges: DomChanges, frontier: StateNode[]): Promise<void> {
    if (this.#stateManager.isNewState(to.id)) {
      this.#stateManager.registerState(to);
      this.#graph.addState(to);
      this.#stateUrls.set(to.id, this.#page.url());
      await this.#captureScreenshot('state', to.id);

      if (to.depth < this.#config.maxDepth) {
        frontier.push(to);
      }
    }

    this.#graph.addTransition({
      id: `${from.id}->${to.id}:${action.type}`,
      from: from.id,
      to: to.id,
      action,
      success: true,
      duration,
      domChanges,
    });
  }

  async #unexploredActions(state: StateNode): Promise<CandidateAction[]> {
    const candidates = await this.#rulesEngine.evaluate(state.facts);
    const triedActionKeys = new Set(this.#graph.getTransitionsFrom(state.id).map((t) => this.#actionKey(t.action)));
    return candidates.filter((c) => !triedActionKeys.has(this.#actionKey(c)));
  }

  #takeNext(frontier: StateNode[]): StateNode {
    // BFS = shift (FIFO), DFS = pop (LIFO)
    return this.#config.strategy === 'bfs' ? frontier.shift()! : frontier.pop()!;
  }

  #hasReachedMaxStates(): boolean {
    return this.#graph.getAllStates().length >= this.#config.maxStates;
  }

  #isTimedOut(): boolean {
    return Date.now() - this.#startTime >= this.#config.timeout;
  }

  #navigatedAwayFrom(state: StateNode): boolean {
    const originalUrl = this.#stateUrls.get(state.id)!;
    return new URL(this.#page.url()).pathname !== new URL(originalUrl).pathname;
  }

  #actionKey(action: CandidateAction): string {
    if (action.type === 'sequence') {
      return `sequence:${action.steps.map((s) => `${s.action.type}:${s.action.targetUid}`).join('+')}`;
    }
    return `${action.type}:${getTargetUid(action)}`;
  }

  async #rollbackToState(targetState: StateNode): Promise<void> {
    const url = this.#stateUrls.get(targetState.id);
    if (url) {
      await this.#page.goto(url, { waitUntil: 'load' });
      await this.#readiness.waitForReady();
      await this.#page.waitForTimeout(this.#config.stabilizationTimeout);
    }
  }

  #actionLabel(action: CandidateAction): string {
    if (action.type === 'sequence') {
      const types = action.steps.map((s) => s.action.type).join('+');
      return `sequence-${types}`;
    }
    return `${action.type}-${getTargetUid(action)}`;
  }

  /**
   * Best-effort raw PNG capture used for visual debugging of the graph.
   * Silent no-op when the matching boolean is off OR `screenshotsDir` is unset.
   * Errors are swallowed: a missing screenshot must never break exploration.
   */
  async #captureScreenshot(kind: 'state' | 'transition', label: string): Promise<void> {
    const dir = this.#config.screenshotsDir;
    if (!dir) return;
    const enabled = kind === 'state' ? this.#config.captureStateScreenshots : this.#config.captureTransitionScreenshots;
    if (!enabled) return;

    try {
      fs.mkdirSync(dir, { recursive: true });
      const prefix = this.#config.screenshotsPrefix ? `${this.#config.screenshotsPrefix}-` : '';
      const safe = label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
      const counter = kind === 'transition' ? `${String(this.#transitionCounter++).padStart(4, '0')}-` : '';
      const file = path.join(dir, `${prefix}${kind}-${counter}${safe}.png`);

      await this.#page.screenshot({ path: file, fullPage: false });
    } catch {
      // best-effort
    }
  }
}
