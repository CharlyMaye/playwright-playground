import { Injector } from '../engine';
import { TestContext } from '../engine/test.context';
import { ActionExecutor, computeDomChanges } from './ActionExecutor';
import { DOMExtractor } from './DOMExtractor';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationGraph } from './ExplorationGraph';
import { ExplorationScope } from './ExplorationScope';
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
}

@Injector({
  Provide: [
    TestContext,
    ExplorationScope,
    DOMExtractor,
    RulesEngine,
    ActionExecutor,
    StateManager,
    ExplorationGraph,
    ExplorationConfig,
  ],
})
export class ConcreteExplorer extends Explorer {
  readonly #page;
  readonly #extractor: DOMExtractor;
  readonly #rulesEngine: RulesEngine;
  readonly #executor: ActionExecutor;
  readonly #stateManager: StateManager;
  readonly #graph: ExplorationGraph;
  readonly #config: ExplorationConfig;
  #failedActions = 0;
  #startTime = 0;

  constructor(
    protected testContext: TestContext,
    protected explorationScope: ExplorationScope,
    protected dOMExtractor: DOMExtractor,
    protected rulesEngine: RulesEngine,
    protected actionExecutor: ActionExecutor,
    protected stateManager: StateManager,
    protected explorationGraph: ExplorationGraph,
    protected explorationConfig: ExplorationConfig
  ) {
    super();
    this.#page = testContext.page;
    this.#extractor = dOMExtractor;
    this.#rulesEngine = rulesEngine;
    this.#executor = actionExecutor;
    this.#stateManager = stateManager;
    this.#graph = explorationGraph;
    this.#config = explorationConfig;
  }

  async explore(): Promise<ExplorationGraph> {
    this.#startTime = Date.now();
    this.#failedActions = 0;

    // 1. Extract initial facts
    const initialFacts = await this.#extractor.extract();

    // 2. Capture initial state
    const initialState = this.#stateManager.captureState(initialFacts, 0, this.#config.rootSelector);
    this.#stateManager.registerState(initialState);
    this.#graph.addState(initialState);

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

          // Skip self-loops (action didn't change DOM state)
          if (newState.id === currentState.id) {
            await this.#rollbackToState(currentState, stateUrls);
            continue;
          }

          // Register state and transition
          if (this.#stateManager.isNewState(newState.id)) {
            this.#stateManager.registerState(newState);
            this.#graph.addState(newState);
            stateUrls.set(newState.id, this.#page.url());

            // Add to frontier only if depth limit not reached
            if (newState.depth < this.#config.maxDepth) {
              frontier.push(newState);
            }
          }
          this.#graph.addTransition(transition);

          // Rollback: reload page and replay path to current state
          await this.#rollbackToState(currentState, stateUrls);
        } else {
          this.#failedActions++;
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
      await this.#page.waitForTimeout(this.#config.stabilizationTimeout);
    }
  }
}
