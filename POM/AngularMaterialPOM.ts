import { ExpectContext, TestContext } from '../engine';

export class AngularMaterialPOM {
  constructor(
    protected testContext: TestContext,
    protected expectContext: ExpectContext
  ) {}
  async goto() {
    await this.testContext.page.goto('https://material.angular.io/');
  }

  // vérification du style
  public async testAutocompleteStyle() {
    await this.#gotoAutocompletePage();
  }
  // Vérification du comportement
  public async testAutocompleteFilterBehavior() {
    await this.#gotoAutocompletePage();
  }

  async #gotoAutocompletePage() {
    const url = 'https://material.angular.dev/components/button/examples#button-overview';
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
    } catch {
      console.warn('No cookie banner to dismiss');
    }
  }
}
