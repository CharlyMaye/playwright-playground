import { ExpectContext, Injector, TestContext } from '../engine';
import { RuleEnginePOM } from './BuilderPOM';

export abstract class VisualRegressionPOM extends RuleEnginePOM {
  abstract goto(url: string): Promise<void>;
}

@Injector({ Provide: [TestContext, ExpectContext] })
export class ConcreteVisualRegressionPOM extends VisualRegressionPOM {
  protected _selectors: Record<string, string> = {};

  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  async goto(url: string): Promise<void> {
    await this._page.goto(url, { waitUntil: 'load' });
  }
}
