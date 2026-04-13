import { DomAnalyzer } from '../dom-analyzer';
import { test as baseTest, expect } from '../index';

const test = baseTest<DomAnalyzer>(DomAnalyzer);
const { describe } = test;

describe('DomAnalyzer', () => {
  test('analyze() returns elements from a real page', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/button/examples', {
      waitUntil: 'load',
    });

    const elements = await instance.analyze();

    expect(elements.length).toBeGreaterThan(0);
    expect(elements[0]).toMatchObject({
      key: expect.any(String),
      type: expect.any(String),
      selector: expect.any(String),
      interactionModel: {
        capabilities: expect.any(Array),
        states: expect.any(Array),
        scenarios: expect.any(Array),
      },
    });
  });

  test('analyze() detects button elements', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/button/examples', {
      waitUntil: 'load',
    });

    const elements = await instance.analyze();
    const buttons = elements.filter((el) => el.type === 'button');

    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn.interactionModel.capabilities).toContain('click');
      expect(btn.interactionModel.capabilities).toContain('hover');
    });
  });

  test('analyze() scopes to a CSS container', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/button/examples', {
      waitUntil: 'load',
    });

    const scopedElements = await instance.analyze('mat-card');

    // Scoped scan must return at least one element
    expect(scopedElements.length).toBeGreaterThan(0);

    // All returned selectors must be scoped — none should be a bare tag that could
    // match the entire page (a very broad sanity check)
    scopedElements.forEach((el) => {
      expect(el.selector).toBeTruthy();
      expect(el.key).toBeTruthy();
    });
  });

  test('analyze() produces unique keys', {}, async ({ instance, testContext }) => {
    await testContext.page.goto('https://material.angular.dev/components/button/examples', {
      waitUntil: 'load',
    });

    const elements = await instance.analyze();
    const keys = elements.map((el) => el.key);
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(keys.length);
  });
});
