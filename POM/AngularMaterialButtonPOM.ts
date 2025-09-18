import { ExpectContext, TestContext } from '../engine';
import { BuilderPOM, ConcreteBuilderPOM } from './BuilderPOM';

type ButtonSelector = {
  component: string;
};

export abstract class ButtonPOM extends BuilderPOM<ButtonSelector> {
  public abstract scrollIntoViewIfNeeded(): ButtonPOM;

  public abstract hover(): ButtonPOM;

  public abstract focus(): ButtonPOM;
  public abstract focusOut(): ButtonPOM;
}

export class AngularMaterialButtonPOM extends ConcreteBuilderPOM<ButtonSelector> implements ButtonPOM {
  protected _selectors: ButtonSelector = {
    component: 'button[matbutton]',
  };
  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  // Technique
  public scrollIntoViewIfNeeded(): ButtonPOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).scrollIntoViewIfNeeded();
    });
  }

  public hover(): ButtonPOM {
    return this._addAction(async () => {
      const element = this._page.locator(this._selectors.component);
      const isDisabled = await element.isDisabled();
      if (isDisabled) {
        await element.hover({ force: true });
      } else {
        await element.hover();
      }
    });
  }

  public focus(): ButtonPOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).focus();
    });
  }
  public focusOut(): ButtonPOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).blur();
    });
  }
}
