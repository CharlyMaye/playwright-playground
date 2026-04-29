import type { ClipRegion } from '../explorer/screenshot-utils';
import { expect, TestContext } from './';

export type ScreenshotOptions = {
  clip?: ClipRegion;
};

export abstract class ExpectContext {
  abstract expectToHaveScreenshot(name?: string, options?: ScreenshotOptions): Promise<void>;
  abstract checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void>;
}
export class ConcreteExpectContext extends ExpectContext {
  constructor(protected testContext: TestContext) {
    super();
  }
  public async expectToHaveScreenshot(name?: string, options?: ScreenshotOptions): Promise<void> {
    const screenshotOpts: Record<string, unknown> = {};
    if (options?.clip) {
      screenshotOpts['clip'] = options.clip;
    }
    if (name) {
      const fileName = name.endsWith('.png') ? name : `${name}.png`;
      await expect(this.testContext.page).toHaveScreenshot(fileName, screenshotOpts);
    } else {
      await expect(this.testContext.page).toHaveScreenshot(screenshotOpts);
    }
  }
  public async checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void> {
    const actualValue = await getInputValue();
    if (actualValue !== expectedValue) {
      throw new Error(`Expected "${expectedValue}", but got "${actualValue}"`);
    }
  }
}
