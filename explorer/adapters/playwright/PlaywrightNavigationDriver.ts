import { Injector } from '../../../engine';
import { TestContext } from '../../../engine/test.context';
import { NavigationDriver } from '../../NavigationDriver';

/** Web implementation: location = current page URL. */
@Injector({ Provide: [TestContext] })
export class PlaywrightNavigationDriver extends NavigationDriver {
  readonly #page;

  constructor(testContext: TestContext) {
    super();
    this.#page = testContext.page;
  }

  currentLocation(): string {
    return this.#page.url();
  }

  async captureScreenshot(path: string): Promise<void> {
    await this.#page.screenshot({ path, fullPage: false });
  }

  async wait(ms: number): Promise<void> {
    await this.#page.waitForTimeout(ms);
  }
}
