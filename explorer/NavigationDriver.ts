/**
 * Driver-side navigation & observation primitives needed by the core
 * exploration loop. Implemented per backend (Playwright, Puppeteer, WPF…).
 *
 * Port rule: no signature here may mention a web-only concept (DOM, CSS,
 * JS, URL semantics) — `currentLocation()` returns an opaque identifier
 * (a URL on the web, a screen/window identifier on desktop backends).
 */
export abstract class NavigationDriver {
  /** Opaque identifier of where the application currently is. */
  abstract currentLocation(): string;
  /** Best-effort raw screenshot written to `path`. */
  abstract captureScreenshot(path: string): Promise<void>;
  /** Passive wait used for DOM/UI stabilization. */
  abstract wait(ms: number): Promise<void>;
}
