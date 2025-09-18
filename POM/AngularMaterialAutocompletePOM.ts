import { Locator } from '@playwright/test';
import { ExpectContext, TestContext } from '../engine';
import { BuilderPOM, ConcreteBuilderPOM } from './BuilderPOM';

type AutocompleteSelector = {
  component: string;
  input: string;
  label: string;
  dropDown: string;
  option: string;
};

export abstract class AutocompletePOM extends BuilderPOM<AutocompleteSelector> {
  public abstract scrollIntoViewIfNeeded(): AutocompletePOM;

  public abstract hover(): AutocompletePOM;

  public abstract focus(): AutocompletePOM;
  public abstract focusOut(): AutocompletePOM;

  public abstract openDropDown(): AutocompletePOM;
  public abstract closeDropDown(): AutocompletePOM;

  public abstract hoverOptionByIndex(index: number): AutocompletePOM;
  public abstract focusOptionByIndex(index: number): AutocompletePOM;
  public abstract selectOptionByIndex(index: number): AutocompletePOM;

  public abstract selectOptionUsingKeyboard(key: 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft'): AutocompletePOM;

  public abstract setInputValue(value: string): AutocompletePOM;

  public abstract getLabelValue(): Promise<string>;
  public abstract getInputValue(): Promise<string>;
}

export class AngularMaterialAutocompletePOM
  extends ConcreteBuilderPOM<AutocompleteSelector>
  implements AutocompletePOM
{
  protected _selectors: AutocompleteSelector = {
    component: 'mat-form-field',
    label: 'mat-label',
    input: 'input[role="combobox"]',
    dropDown:
      'div.cdk-overlay-container > div.cdk-overlay-connected-position-bounding-box > div.cdk-overlay-pane > div[role="listbox"]',
    option: 'mat-option',
  };
  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  // Technique
  public scrollIntoViewIfNeeded(): AutocompletePOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).scrollIntoViewIfNeeded();
    });
  }

  public hover(): AutocompletePOM {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.component).hover();
    });
  }

  public focus(): AutocompletePOM {
    return this._addAction(async () => {
      await this.#getInputLocator().focus();
    });
  }
  public focusOut(): AutocompletePOM {
    return this._addAction(async () => {
      await this.#getInputLocator().blur();
    });
  }

  public openDropDown(): AutocompletePOM {
    return this._addAction(async () => {
      const input = this.#getInputLocator();
      await input.focus();
      await input.click();
    });
  }
  public closeDropDown(): AutocompletePOM {
    return this._addAction(async () => {
      const input = this.#getInputLocator();
      await input.focus();
      await input.press('Escape');
    });
  }

  public hoverOptionByIndex(index: number): AutocompletePOM {
    return this._addAction(async () => {
      const options = await this.#getOptionsLocator();
      await this.#isIndexValid(options, index);
      await options.nth(index).hover();
    });
  }
  public focusOptionByIndex(index: number): AutocompletePOM {
    return this._addAction(async () => {
      const options = await this.#getOptionsLocator();
      await this.#isIndexValid(options, index);
      await options.nth(index).focus();
    });
  }
  public selectOptionByIndex(index: number): AutocompletePOM {
    return this._addAction(async () => {
      const options = await this.#getOptionsLocator();
      await this.#isIndexValid(options, index);
      await options.nth(index).click();
    });
  }

  public selectOptionUsingKeyboard(key: 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft') {
    return this._addAction(async () => {
      const options = await this.#getOptionsLocator();
      await this.#hasOptions(options);
      const input = this.#getInputLocator();
      await input.focus();
      await input.press(key);
      await input.press('Enter');
    });
  }

  public setInputValue(value: string): AutocompletePOM {
    return this._addAction(async () => {
      const input = this.#getInputLocator();
      await input.fill(value);
      await input.dispatchEvent('input');
    });
  }

  public async getLabelValue(): Promise<string> {
    const result = await this._page.locator(this._selectors.component).locator(this._selectors.label).innerText();
    this._cleanActions();
    return result;
  }
  public async getInputValue(): Promise<string> {
    const result = await this.#getInputLocator().inputValue();
    this._cleanActions();
    return result;
  }

  #getInputLocator() {
    return this._page.locator(this._selectors.component).locator(this._selectors.input);
  }
  #isDropDownOpen() {
    return this._page.locator(this._selectors.dropDown).isVisible();
  }
  async #getOptionsLocator() {
    if (!(await this.#isDropDownOpen())) {
      throw new Error('Dropdown is not open');
    }
    return this._page.locator(this._selectors.dropDown).locator(this._selectors.option);
  }
  async #isIndexValid(options: Locator, index: number) {
    const count = await options.count();
    if (index < 0 || index >= count) {
      throw new Error(`Index ${index} is out of bounds. There are ${count} options.`);
    }
  }
  async #hasOptions(options: Locator) {
    const count = await options.count();
    if (count <= 0) {
      throw new Error(`There are ${count} options.`);
    }
  }
}
