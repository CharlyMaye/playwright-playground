/**
 * Port: waits until the application is ready before the explorer extracts
 * the next state.
 *
 * The readiness criterion comes from `ExplorationConfig.readinessSelector`,
 * an opaque expression interpreted by the driver (CSS selector on the web,
 * AutomationElement condition on desktop backends). When unset, this is a
 * no-op.
 *
 * Used by both {@link Explorer} (initial extraction + rollback) and
 * {@link ActionExecutor} (after each action).
 */
export abstract class ReadinessChecker {
  abstract waitForReady(): Promise<void>;
}
