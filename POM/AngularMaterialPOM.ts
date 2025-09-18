import { ExpectContext, resolve, TestContext } from '../engine';
import { AutocompletePOM } from './AngularMaterialAutocompletePOM';
import { ButtonPOM } from './AngularMaterialButtonPOM';

export class AngularMaterialPOM {
  constructor(
    protected testContext: TestContext,
    protected expectContext: ExpectContext
  ) {}
  async goto() {
    await this.testContext.page.goto('https://material.angular.io/');
  }

  //#region Autocomplete
  // vérification du style
  async testAutocompleteStyle() {
    await this.#gotoAutocompletePage();

    const componentPom = resolve(AutocompletePOM);
    await componentPom
      .updateSelector('component', '#autocomplete-simple mat-form-field')
      .scrollIntoViewIfNeeded()
      //.enableScreenshot()
      .hover()
      .focus()
      .hoverOptionByIndex(0)
      .selectOptionByIndex(1)
      .openDropDown()
      .hoverOptionByIndex(0)
      .hoverOptionByIndex(1)
      .selectOptionByIndex(0)
      .openDropDown()
      .focusOptionByIndex(1)
      .focusOptionByIndex(0)
      .closeDropDown()
      .execute();
  }
  // Vérification du comportement
  async testAutocompleteFilterBehavior() {
    await this.#gotoAutocompletePage();

    const componentPom = resolve(AutocompletePOM);

    await componentPom
      .updateSelector('component', '#autocomplete-require-selection')
      .scrollIntoViewIfNeeded()
      //.enableScreenshot()
      .focus()
      .setInputValue('T')
      .closeDropDown()
      .execute();

    await this.expectContext.checkValue(componentPom.getLabelValue.bind(componentPom), 'Number');
    await this.expectContext.checkValue(componentPom.getInputValue.bind(componentPom), '');
  }
  // Vérification du comportement
  async testAutocompleteKeyboardBehavior() {
    await this.#gotoAutocompletePage();
    const componentPom = resolve(AutocompletePOM);
    await componentPom
      .updateSelector('component', '#autocomplete-auto-active-first-option')
      .scrollIntoViewIfNeeded()
      // .enableScreenshot()
      .focus()
      .selectOptionUsingKeyboard('ArrowDown')
      .execute();
  }

  async #gotoAutocompletePage() {
    const url = 'https://material.angular.dev/components/autocomplete/examples';
    console.warn(`Navigating to ${url}`);
    await this.testContext.page.goto(url, {
      waitUntil: 'load',
    });

    try {
      await this.testContext.page
        .locator('button', {
          hasText: 'Okay, got it',
        })
        .click();
    } catch (error) {
      console.warn('No cookie banner to dismiss');
    }
  }
  //#endregion

  //#region Button
  // vérification du style
  async testButtonStyle(selector: string) {
    await this.#gotoButtonPage();
    const componentPom = resolve(ButtonPOM);
    await componentPom
      .updateSelector('component', selector)
      .scrollIntoViewIfNeeded()
      // .enableScreenshot()
      .focus()
      .focusOut()
      .hover()
      .execute();
  }

  async #gotoButtonPage() {
    const url = 'http://localhost:4200/material/button';
    console.warn(`Navigating to ${url}`);
    await this.testContext.page.goto(url, {
      waitUntil: 'load',
    });

    try {
      await this.testContext.page
        .locator('button', {
          hasText: 'Okay, got it',
        })
        .click();
    } catch (error) {
      console.warn('No cookie banner to dismiss');
    }
  }
  //#endregion
}
