/* eslint-disable playwright/expect-expect */
import { loadAnalysis } from '../analysis/loader';
import { test as baseTest } from '../engine';
import { VisualRegressionPOM } from '../POM';

const test = baseTest<VisualRegressionPOM>(VisualRegressionPOM);
const { describe } = test;

const data = [
  {
    name: 'button-examples',
    url: 'https://material.angular.dev/components/button/examples',
    scope: 'mat-card',
    rules: [{ target: { type: 'button' }, action: 'hover' }],
  },
  {
    name: 'select-examples',
    url: 'https://material.angular.dev/components/select/overview',
    scope: 'mat-card',
    rules: [{ target: { type: 'select' }, action: 'open', priority: 10 }],
  },
  {
    name: 'checkbox-examples',
    url: 'https://material.angular.dev/components/checkbox/overview',
    scope: 'mat-card',
    rules: [{ target: { type: 'checkbox' }, action: 'hover' }],
  },
];

describe('Visual Regression', () => {
  describe('Button examples', () => {
    test('hover all buttons', {}, async ({ instance }) => {
      await instance.goto('https://material.angular.dev/components/button/examples');

      const elements = loadAnalysis('button-examples');

      await instance
        .loadModel(elements)
        .setScope('mat-card')
        .addRule({ target: { type: 'button' }, action: 'hover' })
        .buildRules()
        .execute();
    });
  });

  describe('Select examples', () => {
    test('open all selects', {}, async ({ instance }) => {
      await instance.goto('https://material.angular.dev/components/select/overview');

      const elements = loadAnalysis('select-examples');

      await instance
        .loadModel(elements)
        .setScope('mat-card')
        .addRule({ target: { type: 'select' }, action: 'open', priority: 10 })
        .buildRules()
        .execute();
    });
  });

  describe('Checkbox examples', () => {
    test('hover all checkboxes', {}, async ({ instance }) => {
      await instance.goto('https://material.angular.dev/components/checkbox/overview');

      const elements = loadAnalysis('checkbox-examples');

      await instance
        .loadModel(elements)
        .setScope('mat-card')
        .addRule({ target: { type: 'checkbox' }, action: 'hover' })
        .buildRules()
        .execute();
    });
  });
});
