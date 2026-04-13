/* eslint-disable playwright/expect-expect */
import { saveAnalysis } from '../analysis/loader';
import { test as baseTest } from '../engine';
import { DomAnalyzer } from '../engine/dom-analyzer';

const test = baseTest<DomAnalyzer>(DomAnalyzer);
const { describe } = test;

const data = [
  { name: 'button-examples', url: 'https://material.angular.dev/components/button/examples' },
  { name: 'select-examples', url: 'https://material.angular.dev/components/select/overview' },
  { name: 'checkbox-examples', url: 'https://material.angular.dev/components/checkbox/overview' },
];

describe('Analyze', () => {
  for (const { name, url } of data) {
    test(name, {}, async ({ instance, testContext }) => {
      await testContext.page.goto(url, { waitUntil: 'load' });

      const elements = await instance.analyze();
      saveAnalysis(name, elements);

      console.log(`[analyze] ${name}: ${elements.length} elements saved`);
    });
  }
});
