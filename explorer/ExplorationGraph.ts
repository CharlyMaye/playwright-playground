import { StateNode, Transition } from './types';

/**
 * Directed graph of states and transitions discovered during an exploration run.
 *
 * Each node ({@link StateNode}) represents a stable UI state identified by a
 * SHA-256 hash of its interactive elements. Each edge ({@link Transition})
 * represents a candidate action that caused a transition from one state to
 * another (or a self-loop when the state hash does not change).
 *
 * The graph is the shared source of truth used by {@link Explorer},
 * {@link ScenarioExporter} and {@link GraphSerializer}.
 */
export abstract class ExplorationGraph {
  // Mutations
  /** Adds a state node to the graph. No-op if the `id` is already present. */
  abstract addState(node: StateNode): void;
  /** Registers a transition between two states (or towards a pseudo-state). */
  abstract addTransition(transition: Transition): void;

  // Queries
  /** Returns `true` if a state with this identifier is already in the graph. */
  abstract hasState(id: string): boolean;
  /** Returns the state node for the given identifier, or `undefined`. */
  abstract getState(id: string): StateNode | undefined;
  /** Returns all registered state nodes. */
  abstract getAllStates(): StateNode[];
  /** Returns every transition in the graph, including self-loops. */
  abstract getTransitions(): Transition[];
  /** Outgoing transitions from a state (actions attempted from that state). */
  abstract getTransitionsFrom(stateId: string): Transition[];
  /** Incoming transitions to a state (paths that lead to it). */
  abstract getTransitionsTo(stateId: string): Transition[];

  // Traversal
  /** States with no predecessors — entry points of the graph (typically the initial state). */
  abstract getRoots(): StateNode[];
  /** States with no successors — dead ends of the exploration. */
  abstract getLeaves(): StateNode[];
  /**
   * Returns paths from each entry point to the leaves, used by
   * {@link ScenarioExporter} to generate test scenarios.
   *
   * Entry points are the graph roots, or — when a back-edge to the initial
   * state leaves the graph rootless — the shallowest discovered state (see
   * the implementation note), so a fully-cyclic graph still yields scenarios.
   *
   * Bounded on purpose: the number of simple paths in a branching/cyclic graph
   * is exponential, so collection stops once `maxScenarios` paths are gathered
   * (and no path exceeds `maxDepth` edges).
   *
   * @param maxScenarios - Hard cap on the number of paths returned.
   * @param maxDepth     - Maximum number of edges per path.
   */
  abstract getScenarios(maxScenarios?: number, maxDepth?: number): Transition[][];

  // Analysis
  /** Detects cycles in the graph (self-loops excluded). */
  abstract getCycles(): Transition[][];
  /** Maximum depth reached in the graph. */
  abstract getDepth(): number;
  /** Summary statistics for the explored graph. */
  abstract getStats(): { states: number; transitions: number; maxDepth: number; cycles: number; deadEnds: number };
}

/**
 * In-memory implementation of {@link ExplorationGraph}.
 *
 * Uses two indexes (`#outgoing`, `#incoming`) for O(1) neighbourhood queries.
 * Cycles are detected via DFS with a stack-marking approach.
 */
export class ConcreteExplorationGraph extends ExplorationGraph {
  readonly #states = new Map<string, StateNode>();
  readonly #outgoing = new Map<string, Transition[]>();
  readonly #incoming = new Map<string, Transition[]>();

  addState(node: StateNode): void {
    if (!this.#states.has(node.id)) {
      this.#states.set(node.id, node);
      this.#outgoing.set(node.id, []);
      this.#incoming.set(node.id, []);
    }
  }

  addTransition(transition: Transition): void {
    this.#appendTransition(this.#outgoing, transition.from, transition);
    this.#appendTransition(this.#incoming, transition.to, transition);
  }

  #appendTransition(index: Map<string, Transition[]>, key: string, transition: Transition): void {
    const list = index.get(key);
    if (list) list.push(transition);
    else index.set(key, [transition]);
  }

  getTransitions(): Transition[] {
    return [...this.#outgoing.values()].flat();
  }

  hasState(id: string): boolean {
    return this.#states.has(id);
  }

  getState(id: string): StateNode | undefined {
    return this.#states.get(id);
  }

  getAllStates(): StateNode[] {
    return [...this.#states.values()];
  }

  getTransitionsFrom(stateId: string): Transition[] {
    return this.#outgoing.get(stateId) ?? [];
  }

  getTransitionsTo(stateId: string): Transition[] {
    return this.#incoming.get(stateId) ?? [];
  }

  getRoots(): StateNode[] {
    return this.getAllStates().filter((s) => this.getTransitionsTo(s.id).filter((t) => t.from !== t.to).length === 0);
  }

  getLeaves(): StateNode[] {
    return this.getAllStates().filter((s) => this.getTransitionsFrom(s.id).length === 0);
  }

  getScenarios(maxScenarios = 1000, maxDepth = Infinity): Transition[][] {
    const scenarios: Transition[][] = [];
    for (const entry of this.#scenarioEntryPoints()) {
      if (scenarios.length >= maxScenarios) break;
      this.#dfsCollectPaths(entry.id, [], new Set(), maxDepth, scenarios, maxScenarios);
    }
    return scenarios;
  }

  /**
   * Entry points from which {@link getScenarios} enumerates paths.
   *
   * Normally the graph {@link getRoots | roots}. But a single back-edge to the
   * initial state — e.g. a "home" link that returns to the start page — leaves
   * the graph with **no roots at all**, which would silently collapse scenario
   * generation to zero even though transitions were discovered. In that case we
   * fall back to the shallowest discovered state(s), i.e. the exploration's
   * natural entry point (the initial state lives at `depth === 0`), so a
   * fully-cyclic graph still yields replayable paths. The `visited` set in
   * {@link #dfsCollectPaths} keeps the traversal finite.
   */
  #scenarioEntryPoints(): StateNode[] {
    const roots = this.getRoots();
    if (roots.length > 0) return roots;

    const states = this.getAllStates();
    if (states.length === 0) return [];
    const minDepth = Math.min(...states.map((s) => s.depth));
    return states.filter((s) => s.depth === minDepth);
  }

  getCycles(): Transition[][] {
    const cycles: Transition[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: Transition[] = [];

    const dfs = (nodeId: string) => {
      visited.add(nodeId);
      inStack.add(nodeId);

      for (const t of this.getTransitionsFrom(nodeId)) {
        // Skip self-loops — they are visual-state transitions, not real cycles
        if (t.from === t.to) continue;
        if (inStack.has(t.to)) {
          // Found a cycle — collect the back-edge path
          const cycleStart = path.findIndex((p) => p.from === t.to || p.to === t.to);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), t]);
          } else {
            cycles.push([t]);
          }
        } else if (!visited.has(t.to)) {
          path.push(t);
          dfs(t.to);
          path.pop();
        }
      }

      inStack.delete(nodeId);
    };

    for (const state of this.getAllStates()) {
      if (!visited.has(state.id)) {
        dfs(state.id);
      }
    }

    return cycles;
  }

  getDepth(): number {
    return Math.max(0, ...this.getAllStates().map((s) => s.depth));
  }

  getStats() {
    return {
      states: this.#states.size,
      transitions: this.getTransitions().length,
      maxDepth: this.getDepth(),
      cycles: this.getCycles().length,
      deadEnds: this.getLeaves().length,
    };
  }

  #dfsCollectPaths(nodeId: string, currentPath: Transition[], visited: Set<string>, maxDepth: number, result: Transition[][], maxResults = Infinity): void {
    // Stop the (potentially exponential) enumeration once the cap is reached.
    if (result.length >= maxResults) return;

    const transitions = this.getTransitionsFrom(nodeId);

    if (transitions.length === 0 && currentPath.length > 0) {
      result.push([...currentPath]);
      return;
    }

    if (currentPath.length >= maxDepth) {
      if (currentPath.length > 0) result.push([...currentPath]);
      return;
    }

    visited.add(nodeId);

    for (const t of transitions) {
      if (result.length >= maxResults) break;
      // Self-loop: include in path without recursing (no new node to visit)
      if (t.from === t.to) {
        currentPath.push(t);
        continue;
      }
      if (!visited.has(t.to)) {
        currentPath.push(t);
        this.#dfsCollectPaths(t.to, currentPath, visited, maxDepth, result, maxResults);
        currentPath.pop();
      }
    }

    // If we accumulated self-loops but no outgoing edges led deeper,
    // emit the current path (self-loops form a leaf scenario).
    if (currentPath.length > 0) {
      const hasNonSelfLoop = transitions.some((t) => t.from !== t.to && !visited.has(t.to));
      if (!hasNonSelfLoop) {
        result.push([...currentPath]);
      }
    }

    // Remove self-loops from the path before backtracking
    while (currentPath.length > 0 && currentPath[currentPath.length - 1].from === currentPath[currentPath.length - 1].to) {
      currentPath.pop();
    }

    visited.delete(nodeId);
  }
}
