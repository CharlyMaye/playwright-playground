import { StateNode } from './types';

/**
 * Ordering strategy for the exploration frontier (Strategy pattern).
 *
 * Breadth-first and depth-first traversal differ in one thing only — the order
 * in which pending states are taken: a FIFO queue yields breadth-first, a LIFO
 * stack yields depth-first. Encapsulating that here keeps the {@link Explorer}
 * loop identical for both, and leaves room for priority-guided frontiers later.
 */
export abstract class Frontier {
  /** Adds a freshly discovered state to the frontier. */
  abstract add(state: StateNode): void;
  /** Removes and returns the next state to explore, or `undefined` if empty. */
  abstract next(): StateNode | undefined;
  /** Number of states currently waiting to be explored. */
  abstract get size(): number;
}

/** FIFO frontier → breadth-first exploration (`strategy: 'bfs'`). */
export class FifoFrontier extends Frontier {
  readonly #queue: StateNode[] = [];

  add(state: StateNode): void {
    this.#queue.push(state);
  }

  next(): StateNode | undefined {
    return this.#queue.shift();
  }

  get size(): number {
    return this.#queue.length;
  }
}

/** LIFO frontier → depth-first exploration (`strategy: 'dfs'`). */
export class LifoFrontier extends Frontier {
  readonly #stack: StateNode[] = [];

  add(state: StateNode): void {
    this.#stack.push(state);
  }

  next(): StateNode | undefined {
    return this.#stack.pop();
  }

  get size(): number {
    return this.#stack.length;
  }
}
