import { expect, TestContext } from './';

export abstract class ExpectContext {
  abstract expectToHaveScreenshot(name?: string): Promise<void>;
  abstract checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void>;
}
export class ConcreteExpectContext extends ExpectContext {
  constructor(protected testContext: TestContext) {
    super();
  }
  public async expectToHaveScreenshot(name?: string): Promise<void> {
    if (name) {
      const fileName = name.endsWith('.png') ? name : `${name}.png`;
      await expect(this.testContext.page).toHaveScreenshot(fileName);
    } else {
      await expect(this.testContext.page).toHaveScreenshot();
    }
  }
  public async checkValue(getInputValue: () => Promise<string>, expectedValue: string): Promise<void> {
    const actualValue = await getInputValue();
    if (actualValue !== expectedValue) {
      throw new Error(`Expected "${expectedValue}", but got "${actualValue}"`);
    }
  }
}
