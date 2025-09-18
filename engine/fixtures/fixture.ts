import {
  test as base,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestType,
} from '@playwright/test';
import { ExpectContext, resolve } from '../index';
import { ConcreteTestContext, TestContext } from '../test.context';
import { AbstractType } from '../type';
import { collectV8CodeCoverageAsync, CollectV8CodeCoverageOptions } from './v8-code-coverage';

type MyFixtures<T = any> = {
  instance: T;
  testContext: TestContext;
  expectContext: ExpectContext;
  forEachTest: void;
  afterEach: void;
  codeCoverageAutoTestFixture: void;
};

type MyWorkerFixtures = {
  beforeAll: void;
  afterAll: void;
  forEachWorker: void;
};

//https://playwright.dev/docs/test-fixtures
export function test<T>(token: AbstractType<T>) {
  const typedTest: TestType<
    PlaywrightTestArgs & PlaywrightTestOptions & MyFixtures<T>,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions & MyWorkerFixtures
  > = base.extend<MyFixtures<T>, MyWorkerFixtures>({
    forEachWorker: [
      async ({}, use) => {
        await use();
      },
      { scope: 'worker', auto: true },
    ],
    beforeAll: [
      async ({}, use) => {
        await use();
      },
      { scope: 'worker', auto: true },
    ],
    page: async ({ page, request, browser, browserName }, use) => {
      const testContext = resolve(TestContext) as ConcreteTestContext;
      testContext.page = page;
      testContext.request = request;
      testContext.browser = browser;
      testContext.browserName = browserName;
      await use(page);
    },
    forEachTest: [
      async ({ page }, use) => {
        await use();
      },
      { auto: true },
    ],
    testContext: async ({}, use) => {
      const testContext = resolve(TestContext) as ConcreteTestContext;
      await use(testContext);
    },
    expectContext: async ({}, use) => {
      const expectContext = resolve(ExpectContext);
      await use(expectContext);
    },
    instance: async ({ page }, use) => {
      const instance = resolve<T>(token);
      await use(instance);
    },
    codeCoverageAutoTestFixture: [
      async ({ browser, page }, use): Promise<void> => {
        const options: CollectV8CodeCoverageOptions = {
          browserType: browser.browserType(),
          page: page,
          use: use,
          enableJsCoverage: true,
          enableCssCoverage: true,
        };
        await collectV8CodeCoverageAsync(options);
      },
      {
        auto: true,
      },
    ],
    afterEach: [
      async ({}, use) => {
        await use();
      },
      { auto: true },
    ],
    afterAll: [
      async ({}, use) => {
        await use();
      },
      { scope: 'worker', auto: true },
    ],
  });

  return typedTest;
}
export { expect } from '@playwright/test';
