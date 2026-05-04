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
import { CandidateAction, StateNode, Transition } from './types';

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
  #failedActions = 0;
  #startTime = 0;
  #transitionCounter = 0;

  constructor(
    protected testContext: TestContext,
    protected explorationScope: ExplorationScope,
    protected dOMExtractor: DOMExtractor,
    protected rulesEngine: RulesEngine,
    protected actionExecutor: ActionExecutor,
    protected stateManager: StateManager,
    protected explorationGraph: ExplorationGraph,
    protected explorationConfig: ExplorationConfig,
    protected readinessChecker: ReadinessChecker
  ) {
    super();
    this.#page = testContext.page;
    this.#extractor = dOMExtractor;
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

    // Wait for SPA readiness before extracting initial state
    await this.#readiness.waitForReady();

    // 1. Extract initial facts
    const initialFacts = await this.#extractor.extract();

    // 2. Capture initial state
    const initialState = this.#stateManager.captureState(initialFacts, 0, this.#config.rootSelector);
    this.#stateManager.registerState(initialState);
    this.#graph.addState(initialState);
    await this.#captureScreenshot('state', initialState.id);

    // 3. Initialize exploration queue/stack
    const frontier: StateNode[] = [initialState];
    // Store the URL/path to replay for rollback
    const stateUrls = new Map<string, string>();
    stateUrls.set(initialState.id, this.#page.url());

    // 4. Main exploration loop
    while (frontier.length > 0 && !this.#isTimedOut()) {
      // BFS = shift (FIFO), DFS = pop (LIFO)
      const currentState = this.#config.strategy === 'bfs' ? frontier.shift()! : frontier.pop()!;

      // Check maxStates limit
      if (this.#graph.getAllStates().length >= this.#config.maxStates) break;

      // Skip expanding states at or beyond maxDepth
      if (currentState.depth >= this.#config.maxDepth) continue;

      // Get candidate actions from rules engine
      const candidates = await this.#rulesEngine.evaluate(currentState.facts);

      // Filter out actions already tried from this state
      const existingTransitions = this.#graph.getTransitionsFrom(currentState.id);
      const unexplored = this.#filterUnexplored(candidates, existingTransitions);

      // Execute each unexplored action
      for (const action of unexplored) {
        if (this.#isTimedOut()) break;
        if (this.#graph.getAllStates().length >= this.#config.maxStates) break;

        // Execute the action
        const result = await this.#executor.execute(action);
        await this.#captureScreenshot('transition', this.#actionLabel(action));

        if (result.success) {
          const currentUrl = this.#page.url();
          const originalUrl = stateUrls.get(currentState.id)!;

          // Navigation detected → boundary transition, don't extract from foreign page
          if (new URL(currentUrl).pathname !== new URL(originalUrl).pathname) {
            const navTransition: Transition = {
              id: `${currentState.id}->nav:${action.type}:${(action as { targetUid: string }).targetUid}`,
              from: currentState.id,
              to: '__external_navigation__',
              action,
              success: true,
              duration: result.duration,
              domChanges: { appeared: [], disappeared: [], modified: [] },
              navigationUrl: currentUrl,
            };
            this.#graph.addTransition(navTransition);
            await this.#rollbackToState(currentState, stateUrls);
            continue;
          }

          // Same page → extract facts normally
          const newFacts = await this.#extractor.extract();
          const newState = this.#stateManager.captureState(newFacts, currentState.depth + 1, this.#config.rootSelector);

          // Compute DOM changes
          const domChanges = computeDomChanges(currentState.facts, newFacts);

          // Create transition
          const transition: Transition = {
            id: `${currentState.id}->${newState.id}:${action.type}`,
            from: currentState.id,
            to: newState.id,
            action,
            success: true,
            duration: result.duration,
            domChanges,
          };

          // Skip self-loops (action didn't change DOM state) but record them
          // so visual regression tests can replay hover/focus/mousedown actions.
          if (newState.id === currentState.id) {
            const selfTransition: Transition = {
              id: `${currentState.id}->${currentState.id}:${action.type}:${(action as { targetUid: string }).targetUid}`,
              from: currentState.id,
              to: currentState.id,
              action,
              success: true,
              duration: result.duration,
              domChanges,
              selfLoop: true,
            };
            this.#graph.addTransition(selfTransition);
            await this.#rollbackToState(currentState, stateUrls);
            continue;
          }

          // Register state and transition
          if (this.#stateManager.isNewState(newState.id)) {
            this.#stateManager.registerState(newState);
            this.#graph.addState(newState);
            stateUrls.set(newState.id, this.#page.url());
            await this.#captureScreenshot('state', newState.id);

            // Add to frontier only if depth limit not reached
            if (newState.depth < this.#config.maxDepth) {
              frontier.push(newState);
            }
          }
          this.#graph.addTransition(transition);

          // Rollback: reload page and replay path to current state
          await this.#rollbackToState(currentState, stateUrls);
        } else {
          // Check if the "failure" was actually a navigation
          const currentUrl = this.#page.url();
          const originalUrl = stateUrls.get(currentState.id)!;
          if (new URL(currentUrl).pathname !== new URL(originalUrl).pathname) {
            const navTransition: Transition = {
              id: `${currentState.id}->nav:${action.type}:${(action as { targetUid: string }).targetUid}`,
              from: currentState.id,
              to: '__external_navigation__',
              action,
              success: true,
              duration: result.duration,
              domChanges: { appeared: [], disappeared: [], modified: [] },
              navigationUrl: currentUrl,
            };
            this.#graph.addTransition(navTransition);
            await this.#rollbackToState(currentState, stateUrls);
          } else {
            this.#failedActions++;
          }
        }
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

  #isTimedOut(): boolean {
    return Date.now() - this.#startTime >= this.#config.timeout;
  }

  #filterUnexplored(candidates: CandidateAction[], existingTransitions: Transition[]): CandidateAction[] {
    const triedActionKeys = new Set(existingTransitions.map((t) => this.#actionKey(t.action)));
    return candidates.filter((c) => !triedActionKeys.has(this.#actionKey(c)));
  }

  #actionKey(action: CandidateAction): string {
    if (action.type === 'sequence') {
      return `sequence:${action.steps.map((s) => `${s.action.type}:${s.action.targetUid}`).join('+')}`;
    }
    return `${action.type}:${(action as { targetUid: string }).targetUid}`;
  }

  async #rollbackToState(targetState: StateNode, stateUrls: Map<string, string>): Promise<void> {
    // Solution 1: reload the page and navigate back
    const url = stateUrls.get(targetState.id);
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
    const target = (action as { targetUid?: string }).targetUid ?? '';
    return `${action.type}-${target}`;
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
