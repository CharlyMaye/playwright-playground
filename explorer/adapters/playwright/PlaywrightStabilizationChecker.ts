import { Injector } from '../../../engine';
import { TestContext } from '../../../engine/test.context';
import { ExplorationConfig } from '../../ExplorationConfig';
import { StabilizationChecker } from '../../StabilizationChecker';

/**
 * Arguments handed to the in-browser settle routine. Kept as a plain object so
 * Playwright can serialise it across the protocol boundary.
 */
type SettleArgs = {
  quietMs: number;
  timeoutMs: number;
  rootSelector: string;
  checkLayout: boolean;
};

/**
 * Runs IN THE BROWSER via `page.evaluate` — must stay self-contained (no
 * closure over module scope, Playwright serialises its source).
 *
 * Resolves once the page has been quiet for `quietMs` (no DOM mutation) and,
 * when `checkLayout` is set, the root element's bounding box is identical
 * across two consecutive animation frames — which catches CSS transitions that
 * move/resize elements without mutating the DOM. A hard cap at `timeoutMs`
 * guarantees the promise always settles, even on pages that never go quiet
 * (carousels, spinners, clocks).
 */
function waitForSettled({ quietMs, timeoutMs, rootSelector, checkLayout }: SettleArgs): Promise<void> {
  return new Promise<void>((resolve) => {
    const root = document.querySelector(rootSelector) ?? document.documentElement;
    let quietTimer: ReturnType<typeof setTimeout>;
    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(hardCap);
      resolve();
    };

    // After a quiet window, confirm the layout is also stable across two frames
    // before declaring the UI settled; if it is still moving, restart the window.
    const confirmStable = (): void => {
      if (!checkLayout) {
        finish();
        return;
      }
      const before = root.getBoundingClientRect();
      requestAnimationFrame(() => {
        const after = root.getBoundingClientRect();
        const stable = before.x === after.x && before.y === after.y && before.width === after.width && before.height === after.height;
        if (stable) finish();
        else scheduleQuiet();
      });
    };

    const scheduleQuiet = (): void => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(confirmStable, quietMs);
    };

    const observer = new MutationObserver(scheduleQuiet);
    observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true, characterData: true });

    const hardCap = setTimeout(finish, timeoutMs);
    scheduleQuiet();
  });
}

/**
 * Web implementation of {@link StabilizationChecker}.
 *
 * `'fixed'` reproduces the historical unconditional `waitForTimeout`; the
 * `'dom-quiet'` / `'dom-quiet+layout'` strategies run {@link waitForSettled} in
 * the page and return as soon as the UI goes quiet, bounded by
 * {@link ExplorationConfig.stabilizationTimeout}.
 */
@Injector({ Provide: [TestContext, ExplorationConfig] })
export class PlaywrightStabilizationChecker extends StabilizationChecker {
  readonly #page;
  readonly #config: ExplorationConfig;

  constructor(testContext: TestContext, explorationConfig: ExplorationConfig) {
    super();
    this.#page = testContext.page;
    this.#config = explorationConfig;
  }

  async waitUntilStable(timeoutMs?: number): Promise<void> {
    const strategy = this.#config.stabilizationStrategy;
    const cap = timeoutMs ?? this.#config.stabilizationTimeout;

    if (strategy === 'fixed') {
      await this.#page.waitForTimeout(cap);
      return;
    }

    const args: SettleArgs = {
      quietMs: this.#config.stabilizationQuietPeriod,
      timeoutMs: cap,
      rootSelector: this.#config.rootSelector,
      checkLayout: strategy === 'dom-quiet+layout',
    };

    // Swallow evaluate failures (e.g. a navigation tore down the context
    // mid-wait): the hard cap inside the page already bounds the wait, and a
    // missing settle must never break exploration.
    await this.#page.evaluate(waitForSettled, args).catch(() => {});
  }
}
