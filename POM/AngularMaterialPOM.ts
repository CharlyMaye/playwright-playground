import { ExpectContext, TestContext } from '../engine';

export class AngularMaterialPOM {
  constructor(
    protected testContext: TestContext,
    protected expectContext: ExpectContext
  ) {}
  async goto() {
    await this.#gotoAutocompletePage('https://material.angular.dev/');
  }

  // vérification du style
  public async testAutocompleteStyle() {
    await this.#gotoAutocompletePage('https://material.angular.dev/components/button/examples#button-overview');
  }
  // Vérification du comportement
  public async testAutocompleteFilterBehavior() {
    await this.#gotoAutocompletePage('https://material.angular.dev/components/button/examples#button-overview');
  }

  async #gotoAutocompletePage(url: string) {
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
