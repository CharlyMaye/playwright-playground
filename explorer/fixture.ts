import { test as base, expect } from '@playwright/test';
import { resolve } from '../engine';
import { collectV8CodeCoverageAsync, CollectV8CodeCoverageOptions } from '../engine/fixtures/v8-code-coverage';
import { ConcreteTestContext, TestContext } from '../engine/test.context';
import { ConcreteExplorationConfig, PartialExplorationConfig } from './ExplorationConfig';
import { ExplorationGraph } from './ExplorationGraph';
import { Explorer } from './Explorer';
import { ConcreteScenarioExporter, ScenarioExporter } from './ScenarioExporter';

type ExplorerTestFixture = {
  explorationConfig: PartialExplorationConfig;
  explorer: Explorer;
  explorationGraph: ExplorationGraph;
  scenarioExporter: ScenarioExporter;
  testContext: TestContext;
  forEachTest: void;
  afterEach: void;
  codeCoverageAutoTestFixture: void;
};

type ExplorerWorkerFixtures = {
  beforeAll: void;
  afterAll: void;
  forEachWorker: void;
};

/**
 * Playwright test factory for exploration tests.
 *
 * Usage:
 * ```ts
 * import { explorerTest, expect } from '../explorer/fixture';
 *
 * explorerTest.describe('my exploration', () => {
 *   explorerTest('explores the page', async ({ explorer, explorationGraph, testContext }) => {
 *     await testContext.page.goto('https://example.com', { waitUntil: 'load' });
 *     const graph = await explorer.explore();
 *     expect(graph.getAllStates().length).toBeGreaterThan(0);
 *   });
 * });
 * ```
 */
export const explorerTest = base.extend<ExplorerTestFixture, ExplorerWorkerFixtures>({
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
    async ({}, use) => {
      await use();
    },
    { auto: true },
  ],
  // Override this in individual tests to customise the exploration config
  explorationConfig: [{}, { option: true }],

  testContext: async ({}, use) => {
    const ctx = resolve(TestContext) as ConcreteTestContext;
    await use(ctx);
  },

  explorer: async ({ explorationConfig }, use) => {
    // Register a fresh config singleton before resolving the explorer tree
    // We need to re-create the config with the test-specific overrides
    const config = new ConcreteExplorationConfig(explorationConfig);
    // Temporarily stash the config so DI can pick it up
    (globalThis as Record<string, unknown>).__explorationConfigOverride = config;
    const explorer = resolve(Explorer);
    await use(explorer);
    (globalThis as Record<string, unknown>).__explorationConfigOverride = undefined;
  },

  explorationGraph: async ({}, use) => {
    const graph = resolve(ExplorationGraph);
    await use(graph);
  },

  scenarioExporter: async ({ explorationGraph }, use) => {
    const exporter = new ConcreteScenarioExporter(explorationGraph);
    await use(exporter);
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
    { auto: true },
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

export { expect };
