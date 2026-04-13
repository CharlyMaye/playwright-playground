import { expect, TestContext } from './';

export abstract class ExpectContext {
  abstract expectToHaveScreenshot(): Promise<void>;
  abstract checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void>;
}
export class ConcreteExpectContext extends ExpectContext {
  constructor(protected testContext: TestContext) {
    super();
  }
  public async expectToHaveScreenshot(): Promise<void> {
    await expect(this.testContext.page).toHaveScreenshot();
  }
  public async checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void> {
    const actualValue = await getInputValue();
    if (actualValue !== expectedValue) {
      throw new Error(`Expected "${expectedValue}", but got "${actualValue}"`);
    }
  }
}
