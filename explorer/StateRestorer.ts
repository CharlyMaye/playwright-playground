/**
 * Opaque restore token — only the driver that produced it knows how to
 * interpret it (a URL on the web; an action path or app-restart recipe on
 * backends without URLs, e.g. WPF).
 */
export type RestoreToken = string;

/**
 * State restoration strategy used by the explorer to roll back to an
 * already-discovered state before trying the next action.
 *
 * Web implementation: token = current URL, restore = `goto(url)`.
 * This is a first-class port because backends without URLs (WPF) need a
 * completely different strategy (replay the action path from the root,
 * or restart the application).
 */
export abstract class StateRestorer {
  /** Captures a token that allows restoring the current state later. */
  abstract snapshotRestorePoint(): RestoreToken;
  /** Brings the application back to the state captured by `token`. */
  abstract restore(token: RestoreToken): Promise<void>;
  /**
   * Whether the application has left the state captured by `token`
   * (e.g. an action triggered an external navigation).
   */
  abstract hasLeftRestorePoint(token: RestoreToken): boolean;
}
