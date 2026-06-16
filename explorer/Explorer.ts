import { Injector } from '../engine';
import { ActionExecutor, computeDomChanges } from './ActionExecutor';
import { DOMExtractor } from './DOMExtractor';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationGraph } from './ExplorationGraph';
import { ExplorationObserver } from './ExplorationObserver';
import { exportGraphHtml } from './GraphHtmlExporter';
import { serializeGraph } from './GraphSerializer';
import { FifoFrontier, Frontier, LifoFrontier } from './Frontier';
import { NavigationDriver } from './NavigationDriver';
import { ReadinessChecker } from './ReadinessChecker';
import { RulesEngine } from './RulesEngine';
import { StabilizationChecker } from './StabilizationChecker';
import { StateManager } from './StateManager';
import { RestoreToken, StateRestorer } from './StateRestorer';
import { CandidateAction, DomChanges, ElementFact, getTargetUid, StateNode } from './types';

/**
 * Summary of an exploration session returned by {@link Explorer.getSummary}.
 *
 * All values are derived from the graph produced by `explore()`.
 */
export type ExplorationSummary = {
  /** Total number of distinct states discovered (graph nodes). */
  statesDiscovered: number;
  /** Total number of recorded transitions, including self-loops. */
  transitions: number;
  /** Maximum depth reached in the graph. */
  maxDepthReached: number;
  /** Number of cycles detected in the graph (self-loops excluded). */
  cycles: number;
  /** Number of states with no successors (dead ends). */
  deadEnds: number;
  /** Total exploration duration in milliseconds. */
  totalDuration: number;
  /** Number of actions that failed or could not be executed. */
  failedActions: number;
};

/**
 * Automated UI exploration engine.
 *
 * Orchestrates all ports ({@link DOMExtractor}, {@link RulesEngine},
 * {@link ActionExecutor}, {@link StateManager}, {@link StateRestorer},
 * {@link NavigationDriver}, {@link ReadinessChecker}) to automatically
 * traverse an application's states and build an {@link ExplorationGraph}.
 */
export abstract class Explorer {
  /** Starts the exploration and returns the completed graph. */
  abstract explore(): Promise<ExplorationGraph>;
  /** Returns the metrics of the last (or ongoing) exploration session. */
  abstract getSummary(): ExplorationSummary;
  /** Read-only access to the graph being built. */
  abstract get graph(): ExplorationGraph;
}

/**
 * Concrete implementation of the exploration engine.
 *
 * Manages the main BFS/DFS frontier loop, rollbacks, screenshot captures,
 * navigation detection and HTML graph export.
 * All dependencies are injected via the DI container.
 */
@Injector({
  Provide: [DOMExtractor, RulesEngine, ActionExecutor, StateManager, ExplorationGraph, ExplorationConfig, ReadinessChecker, NavigationDriver, StateRestorer, StabilizationChecker, ExplorationObserver],
})
export class ConcreteExplorer extends Explorer {
  readonly #extractor: DOMExtractor;
  readonly #rulesEngine: RulesEngine;
  readonly #executor: ActionExecutor;
  readonly #stateManager: StateManager;
  readonly #graph: ExplorationGraph;
  readonly #config: ExplorationConfig;
  readonly #readiness: ReadinessChecker;
  readonly #navigation: NavigationDriver;
  readonly #restorer: StateRestorer;
  readonly #stabilization: StabilizationChecker;
  readonly #observer: ExplorationObserver;
  /** Short human-readable label per state (S0, S1, …) for debug trace output. */
  readonly #stateLabels = new Map<string, string>();
  #stateCounter = 0;
  /** Restore token per discovered state, used to roll back during exploration. */
  readonly #restorePoints = new Map<string, RestoreToken>();
  /**
   * Sequence of actions from the initial state to reach each discovered state.
   * Empty for the initial state itself. Used to replay the path when the
   * URL-based restore lands on the wrong state (SPA interactive states where
   * all states share the same URL).
   */
  readonly #actionPaths = new Map<string, CandidateAction[]>();
  /** Restore token of the initial state — used to detect SPA states that share it. */
  #initialToken: RestoreToken | undefined;
  #failedActions = 0;
  #startTime = 0;

  constructor(domExtractor: DOMExtractor, rulesEngine: RulesEngine, actionExecutor: ActionExecutor, stateManager: StateManager, explorationGraph: ExplorationGraph, explorationConfig: ExplorationConfig, readinessChecker: ReadinessChecker, navigationDriver: NavigationDriver, stateRestorer: StateRestorer, stabilizationChecker: StabilizationChecker, explorationObserver: ExplorationObserver) {
    super();
    this.#extractor = domExtractor;
    this.#rulesEngine = rulesEngine;
    this.#executor = actionExecutor;
    this.#stateManager = stateManager;
    this.#graph = explorationGraph;
    this.#config = explorationConfig;
    this.#readiness = readinessChecker;
    this.#navigation = navigationDriver;
    this.#restorer = stateRestorer;
    this.#stabilization = stabilizationChecker;
    this.#observer = explorationObserver;
  }

  get graph(): ExplorationGraph {
    return this.#graph;
  }

  async explore(): Promise<ExplorationGraph> {
    this.#startTime = Date.now();
    this.#failedActions = 0;
    this.#restorePoints.clear();
    this.#actionPaths.clear();
    this.#stateLabels.clear();
    this.#stateCounter = 0;
    this.#initialToken = undefined;
    await this.#observer.onStart?.();

    this.#log(`strategy=${this.#config.strategy} maxDepth=${this.#config.maxDepth} maxStates=${this.#config.maxStates} timeout=${this.#config.timeout}ms`);

    const initialState = await this.#captureInitialState();
    const frontier = this.#createFrontier();
    frontier.add(initialState);

    while (frontier.size > 0 && !this.#isTimedOut()) {
      const currentState = frontier.next()!;

      if (this.#hasReachedMaxStates()) break;
      if (currentState.depth >= this.#config.maxDepth) {
        this.#log(`  skip ${this.#label(currentState)} (depth=${currentState.depth} ≥ maxDepth=${this.#config.maxDepth})`);
        continue;
      }

      const actions = await this.#unexploredActions(currentState);
      this.#log(`\n──── frontier=${frontier.size + 1}`);
      this.#log(`► ${this.#label(currentState)} (d=${currentState.depth}) — ${actions.length} action(s)`);

      // Navigate to currentState before exploring its actions — without this,
      // the page is at whatever state was left after the previous rollback.
      await this.#rollbackToState(currentState);

      for (const action of actions) {
        if (this.#isTimedOut() || this.#hasReachedMaxStates()) break;
        await this.#exploreAction(currentState, action, frontier);
      }

      // currentState is fully explored: its facts are no longer read (rule
      // evaluation and dom-diffing are done) — notify observers (fact eviction).
      await this.#observer.onStateExhausted?.(currentState);
    }

    const summary = this.getSummary();
    this.#log(`\n✓ Done — ${summary.statesDiscovered} states, ${summary.transitions} transitions, depth=${summary.maxDepthReached}, failed=${summary.failedActions}`);

    if (this.#config.graphHtmlPath) {
      exportGraphHtml(serializeGraph(this.#graph), this.#config.graphHtmlPath, 'Exploration Graph', this.#stateLabels);
      this.#log(`  graph HTML → ${this.#config.graphHtmlPath}`);
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
    const state = this.#stateManager.captureState(facts, 0, this.#config.rootSelector, this.#locationKey());
    this.#stateManager.registerState(state);
    this.#graph.addState(state);
    this.#initialToken = this.#restorer.snapshotRestorePoint();
    this.#restorePoints.set(state.id, this.#initialToken);
    this.#actionPaths.set(state.id, []);
    this.#stateLabels.set(state.id, `S${this.#stateCounter++}`);
    await this.#observer.onStateCaptured?.(state);
    this.#log(`✓ initial state ${this.#label(state)} (${state.facts.length} facts, token=${String(this.#initialToken).substring(0, 40)})`);
    return state;
  }

  /** Executes one candidate action from `currentState` and records the outcome in the graph. */
  async #exploreAction(currentState: StateNode, action: CandidateAction, frontier: Frontier): Promise<void> {
    this.#log(`  • ${this.#actionKey(action)}`);
    const result = await this.#executor.execute(action);
    await this.#observer.onActionExecuted?.(action);

    // A navigation can surface as a success OR as a failure (element detached mid-action).
    if (this.#restorer.hasLeftRestorePoint(this.#restorePoints.get(currentState.id)!)) {
      if (this.#config.followNavigation !== 'none' && this.#restorer.isWithinApplication(this.#restorePoints.get(currentState.id)!)) {
        this.#log(`    ↗ in-app navigation`);
        await this.#exploreNavigationDiscovery(currentState, action, result.duration, frontier);
      } else {
        this.#log(`    ↗ external navigation → ${this.#navigation.currentLocation().substring(0, 60)}`);
        this.#recordExternalNavigation(currentState, action, result.duration);
      }
      await this.#rollbackToState(currentState);
      return;
    }

    if (!result.success) {
      this.#failedActions++;
      this.#log(`    ✗ failed`);
      return;
    }

    const newFacts = await this.#extractor.extract();
    const newState = this.#stateManager.captureState(newFacts, currentState.depth + 1, this.#config.rootSelector, this.#locationKey());
    const domChanges = computeDomChanges(this.#liveFacts(currentState), newFacts);

    if (newState.id === currentState.id) {
      this.#log(`    ↺ self-loop`);
      this.#recordSelfLoop(currentState, action, result.duration, domChanges);
    } else {
      const isNew = this.#stateManager.isNewState(newState.id);
      this.#log(`    → ${isNew ? `✓ new ${this.#label(newState)} (d=${newState.depth}, ${newFacts.length} facts)` : `↩ cycle to ${this.#label(newState)}`}`);
      await this.#recordDiscovery(currentState, newState, action, result.duration, domChanges, frontier);
    }
    await this.#rollbackToState(currentState);
  }

  /**
   * Crawler mode (`followNavigation`): an in-application navigation is a
   * discovery, not a boundary — the destination is captured as a state at
   * `depth + 1` and pushed to the frontier like any other discovery.
   * The caller rolls back to `from` afterwards.
   */
  async #exploreNavigationDiscovery(from: StateNode, action: CandidateAction, duration: number, frontier: Frontier): Promise<void> {
    await this.#readiness.waitForReady();
    await this.#stabilization.waitUntilStable();

    const newFacts = await this.#extractor.extract();
    const newState = this.#stateManager.captureState(newFacts, from.depth + 1, this.#config.rootSelector, this.#locationKey());
    const domChanges = computeDomChanges(this.#liveFacts(from), newFacts);

    if (newState.id === from.id) {
      this.#recordSelfLoop(from, action, duration, domChanges);
      return;
    }
    await this.#recordDiscovery(from, newState, action, duration, domChanges, frontier, this.#navigation.currentLocation());
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
      navigationUrl: this.#navigation.currentLocation(),
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

  async #recordDiscovery(from: StateNode, to: StateNode, action: CandidateAction, duration: number, domChanges: DomChanges, frontier: Frontier, navigationUrl?: string): Promise<void> {
    if (this.#stateManager.isNewState(to.id)) {
      this.#stateManager.registerState(to);
      this.#graph.addState(to);
      this.#restorePoints.set(to.id, this.#restorer.snapshotRestorePoint());
      // Store the shortest known path from root to this state so we can
      // replay it when the URL-based restore is insufficient (SPA states).
      const parentPath = this.#actionPaths.get(from.id) ?? [];
      this.#actionPaths.set(to.id, [...parentPath, action]);
      this.#stateLabels.set(to.id, `S${this.#stateCounter++}`);
      await this.#observer.onStateCaptured?.(to);

      if (to.depth < this.#config.maxDepth) {
        frontier.add(to);
      } else {
        // Leaf state (never pushed to the frontier, so never re-evaluated):
        // its facts are only needed for serialization — notify observers now.
        await this.#observer.onStateExhausted?.(to);
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
      ...(navigationUrl !== undefined && { navigationUrl }),
    });
  }

  async #unexploredActions(state: StateNode): Promise<CandidateAction[]> {
    const candidates = await this.#rulesEngine.evaluate(this.#liveFacts(state));
    const triedActionKeys = new Set(this.#graph.getTransitionsFrom(state.id).map((t) => this.#actionKey(t.action)));
    return candidates.filter((c) => this.#executor.supports(c)).filter((c) => !triedActionKeys.has(this.#actionKey(c)));
  }

  /** Selects the frontier ordering once per run: FIFO for BFS, LIFO for DFS. */
  #createFrontier(): Frontier {
    return this.#config.strategy === 'bfs' ? new FifoFrontier() : new LifoFrontier();
  }

  /**
   * Location to fold into state identity — only in crawler mode, so that
   * SPA-mode state hashes stay identical to historically generated graphs.
   */
  #locationKey(): string | undefined {
    return this.#config.followNavigation === 'none' ? undefined : this.#navigation.currentLocation();
  }

  #hasReachedMaxStates(): boolean {
    return this.#graph.getAllStates().length >= this.#config.maxStates;
  }

  #isTimedOut(): boolean {
    return Date.now() - this.#startTime >= this.#config.timeout;
  }

  #actionKey(action: CandidateAction): string {
    if (action.type === 'sequence') {
      return `sequence:${action.steps.map((s) => `${s.action.type}:${s.action.targetUid}`).join('+')}`;
    }
    // Include the option for `selectStrategy: 'all'` so distinct options on the
    // same <select> are treated as distinct (un-tried) actions, not duplicates.
    if (action.type === 'select' && action.option) {
      return `select:${action.targetUid}:${action.option}`;
    }
    return `${action.type}:${getTargetUid(action)}`;
  }

  async #rollbackToState(targetState: StateNode): Promise<void> {
    const token = this.#restorePoints.get(targetState.id);
    if (token === undefined) return;

    const actionPath = this.#actionPaths.get(targetState.id) ?? [];

    // SPA interactive state: same token as the initial page means this state
    // was reached by interaction without a URL change. A plain page.goto would
    // land on the initial state (S0), not the interactive one — replay instead.
    if (actionPath.length > 0 && token === this.#initialToken) {
      this.#log(`  ↺ rollback ${this.#label(targetState)} via replay (${actionPath.length} step(s)): ${actionPath.map((a) => this.#actionKey(a)).join(' → ')}`);
      await this.#restorer.restore(token); // reload to initial URL
      await this.#readiness.waitForReady();
      for (const pathAction of actionPath) {
        await this.#executor.execute(pathAction);
        await this.#readiness.waitForReady();
        await this.#stabilization.waitUntilStable();
      }
    } else {
      this.#log(`  ↺ rollback ${this.#label(targetState)} (token=${String(token).substring(0, 40)})`);
      await this.#restorer.restore(token);
      await this.#readiness.waitForReady();
      await this.#stabilization.waitUntilStable();
    }
  }

  /**
   * Re-asserts that a state still carries its full {@link ElementFact} snapshot.
   *
   * Sound by construction: facts are only ever read here for nodes still on the
   * frontier (the state being explored, or the source of a discovery), and
   * {@link FactEvictionObserver} reduces a node's facts only once it leaves the
   * frontier for good. A frontier node therefore always holds full facts.
   */
  #liveFacts(state: StateNode): ElementFact[] {
    return state.facts as ElementFact[];
  }

  #label(state: StateNode): string {
    return this.#stateLabels.get(state.id) ?? state.id.substring(0, 8);
  }

  #log(msg: string): void {
    if (this.#config.debugTrace) {
      process.stdout.write(`[EXPLORE] ${msg}\n`);
    }
  }

}
