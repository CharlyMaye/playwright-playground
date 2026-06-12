import { SerializedGraph, StateNode, Transition } from './types';

export abstract class ExplorationGraph {
  // Mutations
  abstract addState(node: StateNode): void;
  abstract addTransition(transition: Transition): void;

  // Requêtes
  abstract hasState(id: string): boolean;
  abstract getState(id: string): StateNode | undefined;
  abstract getAllStates(): StateNode[];
  abstract getTransitionsFrom(stateId: string): Transition[];
  abstract getTransitionsTo(stateId: string): Transition[];
  abstract getSuccessors(stateId: string): StateNode[];
  abstract getPredecessors(stateId: string): StateNode[];

  // Traversée
  abstract getRoots(): StateNode[];
  abstract getLeaves(): StateNode[];
  abstract getPathsFrom(stateId: string, maxDepth: number): Transition[][];
  abstract getScenarios(): Transition[][];

  // Analyse
  abstract getCycles(): Transition[][];
  abstract getDepth(): number;
  abstract getStats(): { states: number; transitions: number; maxDepth: number; cycles: number; deadEnds: number };

  // Export
  abstract toJSON(): SerializedGraph;
  abstract toDOT(): string;
  abstract toMermaid(): string;
}

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

  #allTransitions(): Transition[] {
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

  getSuccessors(stateId: string): StateNode[] {
    return this.getTransitionsFrom(stateId)
      .map((t) => this.#states.get(t.to))
      .filter((s): s is StateNode => s !== undefined);
  }

  getPredecessors(stateId: string): StateNode[] {
    return this.getTransitionsTo(stateId)
      .map((t) => this.#states.get(t.from))
      .filter((s): s is StateNode => s !== undefined);
  }

  getRoots(): StateNode[] {
    return this.getAllStates().filter((s) => this.getTransitionsTo(s.id).filter((t) => t.from !== t.to).length === 0);
  }

  getLeaves(): StateNode[] {
    return this.getAllStates().filter((s) => this.getTransitionsFrom(s.id).length === 0);
  }

  getPathsFrom(stateId: string, maxDepth: number): Transition[][] {
    const paths: Transition[][] = [];
    this.#dfsCollectPaths(stateId, [], new Set(), maxDepth, paths);
    return paths;
  }

  getScenarios(): Transition[][] {
    const scenarios: Transition[][] = [];
    for (const root of this.getRoots()) {
      this.#dfsCollectPaths(root.id, [], new Set(), Infinity, scenarios);
    }
    return scenarios;
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
      transitions: this.#allTransitions().length,
      maxDepth: this.getDepth(),
      cycles: this.getCycles().length,
      deadEnds: this.getLeaves().length,
    };
  }

  toJSON(): SerializedGraph {
    return {
      states: this.getAllStates(),
      transitions: this.#allTransitions(),
    };
  }

  toDOT(): string {
    const lines: string[] = ['digraph {'];

    for (const state of this.getAllStates()) {
      const label = `d=${state.depth} f=${state.facts.length}`;
      lines.push(`  "${state.id}" [label="${state.id.substring(0, 8)}\\n${label}"];`);
    }

    for (const t of this.#allTransitions()) {
      lines.push(`  "${t.from}" -> "${t.to}" [label="${t.action.type}"];`);
    }

    lines.push('}');
    return lines.join('\n');
  }

  toMermaid(): string {
    const lines: string[] = ['stateDiagram-v2'];

    for (const state of this.getAllStates()) {
      const shortId = state.id.substring(0, 8);
      lines.push(`  state "${shortId} (d=${state.depth})" as ${this.#mermaidId(state.id)}`);
    }

    for (const t of this.#allTransitions()) {
      lines.push(`  ${this.#mermaidId(t.from)} --> ${this.#mermaidId(t.to)} : ${t.action.type}`);
    }

    return lines.join('\n');
  }

  #mermaidId(id: string): string {
    return `s_${id.substring(0, 8)}`;
  }

  #dfsCollectPaths(nodeId: string, currentPath: Transition[], visited: Set<string>, maxDepth: number, result: Transition[][]): void {
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
      // Self-loop: include in path without recursing (no new node to visit)
      if (t.from === t.to) {
        currentPath.push(t);
        continue;
      }
      if (!visited.has(t.to)) {
        currentPath.push(t);
        this.#dfsCollectPaths(t.to, currentPath, visited, maxDepth, result);
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
