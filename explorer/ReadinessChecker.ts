import { Injector } from '../engine';
import { TestContext } from '../engine/test.context';
import { ExplorationConfig } from './ExplorationConfig';

/**
 * Waits for an SPA-specific readiness selector before allowing the
 * explorer to extract the next state.
 *
 * When `ExplorationConfig.readinessSelector` is unset, this is a no-op.
 *
 * Used by both {@link Explorer} (initial extraction + rollback) and
 * {@link ActionExecutor} (after each action).
 */
export abstract class ReadinessChecker {
  abstract waitForReady(): Promise<void>;
}

@Injector({ Provide: [TestContext, ExplorationConfig] })
export class ConcreteReadinessChecker extends ReadinessChecker {
  readonly #page;
  readonly #config: ExplorationConfig;

  constructor(
    protected testContext: TestContext,
    protected explorationConfig: ExplorationConfig
  ) {
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
