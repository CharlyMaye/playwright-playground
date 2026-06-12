import { Injector } from '../../../engine';
import { TestContext } from '../../../engine/test.context';
import { RestoreToken, StateRestorer } from '../../StateRestorer';

/**
 * Web implementation: a state is restored by replaying its URL.
 *
 * Known limitation (inherited, web-only assumption): states reached by pure
 * interaction without a URL change all share the same token — restoring
 * lands on the page's initial state, and the explorer re-walks from there.
 */
@Injector({ Provide: [TestContext] })
export class PlaywrightStateRestorer extends StateRestorer {
  readonly #page;

  constructor(testContext: TestContext) {
    super();
    this.#page = testContext.page;
  }

  snapshotRestorePoint(): RestoreToken {
    return this.#page.url();
  }

  async restore(token: RestoreToken): Promise<void> {
    await this.#page.goto(token, { waitUntil: 'load' });
  }

  hasLeftRestorePoint(token: RestoreToken): boolean {
    return new URL(this.#page.url()).pathname !== new URL(token).pathname;
  }
}
