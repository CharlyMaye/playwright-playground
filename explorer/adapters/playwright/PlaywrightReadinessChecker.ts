import { Injector } from '../../../engine';
import { TestContext } from '../../../engine/test.context';
import { ExplorationConfig } from '../../ExplorationConfig';
import { ReadinessChecker } from '../../ReadinessChecker';

/** Web implementation: `readinessSelector` is a CSS selector waited to be visible. */
@Injector({ Provide: [TestContext, ExplorationConfig] })
export class PlaywrightReadinessChecker extends ReadinessChecker {
  readonly #page;
  readonly #config: ExplorationConfig;

  constructor(testContext: TestContext, explorationConfig: ExplorationConfig) {
    super();
    this.#page = testContext.page;
    this.#config = explorationConfig;
  }

  async waitForReady(): Promise<void> {
    const selector = this.#config.readinessSelector;
    if (!selector) return;

    try {
      await this.#page.locator(selector).first().waitFor({
        state: 'visible',
        timeout: this.#config.readinessTimeout,
      });
    } catch {
      // Readiness selector never appeared within the timeout.
      // Swallow: the state will still be captured, but it may be partial.
      // The caller's stabilizationTimeout still applies as a fallback.
    }
  }
}
