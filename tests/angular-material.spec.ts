import { test as baseTest } from '../engine';
import { AngularMaterialPOM } from '../POM';

const test = baseTest(AngularMaterialPOM);
const { describe } = test;

describe('Angular Material WebSite', () => {
  test('Angular Material WebSite', {}, async ({ instance, expectContext, testContext }) => {
    await instance.goto();
  });
  describe('Autocomplete', () => {
    test('visual', {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteStyle();
    });
    test('filter', {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteFilterBehavior();
    });
    test('keyboard', {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteKeyboardBehavior();
    });
  });
  describe('Button', async () => {
    const btnPrefix = 'btn';
    const btnType = [
      'text',
      'filled',
      'elevated',
      'outlined',
      'tonal',
      'mat-icon-button',
      'mat-fab',
      'mat-mini-fab',
      'mat-fab-extended',
    ];
    const btnState = ['', 'disabled-interactive', 'disabled', 'anchor'];
    const selectors = [];
    for (const type of btnType) {
      for (const state of btnState) {
        const id = state ? `${btnPrefix}-${type}-${state}` : `${btnPrefix}-${type}`;
        const selector = `[id="${id}"]`;
        selectors.push(selector);
      }
    }
    for (const selector of selectors) {
      test(`visual for ${selector}`, {}, async ({ instance, expectContext, testContext }) => {
        await instance.testButtonStyle(selector);
      });
    }
  });
});
