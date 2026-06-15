import { Locator } from '@playwright/test';
import { Injector } from '../../../engine';
import { TestContext } from '../../../engine/test.context';
import { ExplorationConfig } from '../../ExplorationConfig';

/**
 * Web-adapter service: resolves the exploration scope (root locator +
 * overflow containers) from the config. This contract deliberately speaks
 * Playwright (`Locator`), so it lives in the adapter — only adapter classes
 * (extractor, executor) consume it; the core never sees it.
 */
export abstract class ExplorationScope {
  abstract get root(): Locator;
  abstract get boundary(): 'strict' | 'overflow';
  abstract get overflowSelectors(): string[];
}

@Injector({ Provide: [TestContext, ExplorationConfig] })
export class PlaywrightExplorationScope extends ExplorationScope {
  readonly #root: Locator;
  readonly #boundary: 'strict' | 'overflow';
  readonly #overflowSelectors: string[];

  constructor(testContext: TestContext, explorationConfig: ExplorationConfig) {
    super();
    this.#root = testContext.page.locator(explorationConfig.rootSelector);
    this.#boundary = explorationConfig.boundary;
    this.#overflowSelectors = explorationConfig.overflowSelectors;
  }

  get root(): Locator {
    return this.#root;
  }

  get boundary(): 'strict' | 'overflow' {
    return this.#boundary;
  }

  get overflowSelectors(): string[] {
    return this.#overflowSelectors;
  }
}
