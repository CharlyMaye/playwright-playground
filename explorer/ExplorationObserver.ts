import { CandidateAction, StateNode } from './types';

/**
 * Observer of the exploration lifecycle.
 *
 * Lets cross-cutting concerns (screenshots, fact eviction, tracing…) hook into
 * the loop without {@link Explorer} knowing about them — keeping the explorer's
 * body a pure graph traversal (Observer pattern).
 *
 * Every hook is optional: an observer implements only the events it cares
 * about. Hooks may be async; the explorer awaits them in order.
 */
export abstract class ExplorationObserver {
  /** Called once at the start of each `explore()` run, before the initial capture. */
  onStart?(): void | Promise<void>;
  /** A distinct state was captured and added to the graph (initial state or a new discovery). */
  onStateCaptured?(state: StateNode): void | Promise<void>;
  /** An action was just executed against the UI, before the next snapshot is taken. */
  onActionExecuted?(action: CandidateAction): void | Promise<void>;
  /** A state will no longer be revisited — fully explored, or a depth-limited leaf. */
  onStateExhausted?(state: StateNode): void | Promise<void>;
}
