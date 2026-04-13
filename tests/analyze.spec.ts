/* eslint-disable playwright/expect-expect */
import { saveAnalysis } from '../analysis/loader';
import { test as baseTest } from '../engine';
import { DomAnalyzer } from '../engine/dom-analyzer';

const test = baseTest<DomAnalyzer>(DomAnalyzer);
const { describe } = test;

describe('Analyze', () => {
  test('button-examples', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/button/examples', { waitUntil: 'load' });

    const elements = await instance.analyze();
    saveAnalysis('button-examples', elements);

    console.log(`[analyze] button-examples: ${elements.length} elements saved`);
  });

  test('select-examples', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/select/overview', { waitUntil: 'load' });

    const elements = await instance.analyze();
    saveAnalysis('select-examples', elements);

    console.log(`[analyze] select-examples: ${elements.length} elements saved`);
  });

  test('checkbox-examples', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/checkbox/overview', { waitUntil: 'load' });

    const elements = await instance.analyze();
    saveAnalysis('checkbox-examples', elements);

    console.log(`[analyze] checkbox-examples: ${elements.length} elements saved`);
  });
});
