import { Locator } from '@playwright/test';
import { Injector } from '../engine';
import { TestContext } from '../engine/test.context';
import { ExplorationConfig } from './ExplorationConfig';

export abstract class ExplorationScope {
  abstract get root(): Locator;
  abstract get boundary(): 'strict' | 'overflow';
  abstract get overflowSelectors(): string[];
  abstract isInScope(element: Locator): Promise<boolean>;
  abstract resolveOverflowTarget(ariaControls: string): Locator | null;
}

@Injector({ Provide: [TestContext, ExplorationConfig] })
export class ConcreteExplorationScope extends ExplorationScope {
  readonly #root: Locator;
  readonly #boundary: 'strict' | 'overflow';
  readonly #overflowSelectors: string[];
  readonly #page;

  constructor(
    protected testContext: TestContext,
    protected explorationConfig: ExplorationConfig
  ) {
    super();
    this.#page = testContext.page;
    this.#root = this.#page.locator(explorationConfig.rootSelector);
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

  async isInScope(element: Locator): Promise<boolean> {
    // Check if the element is a descendant of the root container
    const isDescendant = await this.#root
      .locator(element)
      .count()
      .then((c) => c > 0)
      .catch(() => false);

    if (isDescendant) return true;

    // In strict mode, only descendants of root are in scope
    if (this.#boundary === 'strict') return false;

    // In overflow mode, check if the element lives inside an overflow selector
    for (const selector of this.#overflowSelectors) {
      const overflowContainer = this.#page.locator(selector);
      const found = await overflowContainer
        .locator(element)
        .count()
        .then((c) => c > 0)
        .catch(() => false);
      if (found) return true;
    }

    return false;
  }

  resolveOverflowTarget(ariaControls: string): Locator | null {
    if (this.#boundary === 'strict') return null;

    for (const selector of this.#overflowSelectors) {
      const target = this.#page.locator(selector).locator(`#${CSS.escape(ariaControls)}`);
      return target;
    }
    return null;
  }
}
