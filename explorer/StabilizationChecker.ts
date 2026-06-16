/**
 * Port: waits until the UI has settled after an action, before the explorer
 * captures the next state.
 *
 * Replaces a blind fixed delay with a "wait for quiescence, bounded by a
 * timeout" strategy: the implementation watches the UI for activity (DOM
 * mutations, layout movement on the web) and returns as soon as it goes quiet,
 * never waiting longer than {@link ExplorationConfig.stabilizationTimeout}.
 *
 * The criterion is opaque to the core and owned by each driver (MutationObserver
 * + `requestAnimationFrame` on the web; UI Automation events on desktop
 * backends). Used by both {@link Explorer} (after rollback / navigation) and
 * {@link ActionExecutor} (after each action).
 */
export abstract class StabilizationChecker {
  /**
   * Resolves once the UI is stable, or when the timeout elapses.
   *
   * @param timeoutMs - Optional upper-bound override (ms). Defaults to
   *   {@link ExplorationConfig.stabilizationTimeout}. Used by the `'stable'`
   *   sequence wait condition, which carries its own cap.
   */
  abstract waitUntilStable(timeoutMs?: number): Promise<void>;
}
