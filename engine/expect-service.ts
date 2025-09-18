import { expect, TestContext } from './';

export abstract class ExpectContext {
  abstract expectToHaveScreenshot(): Promise<void>;
  abstract checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void>;
}
export class ConcreteExpectContext extends ExpectContext {
  constructor(protected testContext: TestContext) {
    super();
  }
  async expectToHaveScreenshot() {
    await expect(this.testContext.page).toHaveScreenshot();
  }
  async checkValue(getInputValue: () => Promise<string>, expectedValue: string) {
    const actualValue = await getInputValue();
    if (actualValue !== expectedValue) {
      throw new Error(`Expected "${expectedValue}", but got "${actualValue}"`);
    }
  }
}
