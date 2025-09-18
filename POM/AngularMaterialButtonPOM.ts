import { ExpectContext, TestContext } from "../engine";
import { BuilderPOM } from "./BuilderPOM";

type ButtonSelector = {
  component: string;
};

export abstract class ButtonPOM extends BuilderPOM<ButtonSelector> {
  public abstract scrollIntoViewIfNeeded(): ButtonPOM;

  public abstract hover(): ButtonPOM;

  public abstract focus(): ButtonPOM;
  public abstract focusOut(): ButtonPOM;
}

export class AngularMaterialButtonPOM extends ButtonPOM {
  protected _selectors: ButtonSelector = {
    component: "",
  };
  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  // Technique
  public scrollIntoViewIfNeeded(): ButtonPOM {
    return this._addAction(async () => {
      await this._page
        .locator(this._selectors.component)
        .scrollIntoViewIfNeeded();
    });
  }

  public hover(): ButtonPOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).hover();
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
