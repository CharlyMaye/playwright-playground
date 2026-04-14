/**
 * Phase 1 — Exploration generator for IANA example-domains page.
 *
 * Run manually:   npm run explore
 * Or directly:    npx playwright test --project=exploration
 *
 * Generates JSON files in test-results/exploration/ for each scope.
 * These files are consumed by tests/iana-validation.spec.ts (Phase 2).
 */
import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConcreteTestContext } from '../../engine/test.context';
import { ConcreteActionExecutor } from '../../explorer/ActionExecutor';
import { ConcreteDOMExtractor } from '../../explorer/DOMExtractor';
import { ConcreteExplorationConfig, PartialExplorationConfig } from '../../explorer/ExplorationConfig';
import { ConcreteExplorationGraph } from '../../explorer/ExplorationGraph';
import { ConcreteExplorationScope } from '../../explorer/ExplorationScope';
import { ConcreteExplorer } from '../../explorer/Explorer';
import { ConcreteRulesEngine } from '../../explorer/RulesEngine';
import { ConcreteScenarioExporter } from '../../explorer/ScenarioExporter';
import { ConcreteStateManager } from '../../explorer/StateManager';

const IANA_URL = 'https://www.iana.org/help/example-domains';
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '.exploration-data');

const IANA_BASE_CONFIG: PartialExplorationConfig = {
  boundary: 'strict',
  strategy: 'bfs',
  maxDepth: 1,
  maxStates: 50,
  timeout: 15_000,
  stabilizationTimeout: 300,
  domHashStrategy: 'interactive-only',
  ignoreSelectors: [],
  ignoreRepeatedElements: false,
  fillValues: {},
  selectStrategy: 'first',
};

/** Scopes to explore — each produces a separate JSON file */
const SCOPES: Record<string, Partial<PartialExplorationConfig>> = {
  body: {
    rootSelector: 'body',
    maxDepth: 1,
    maxStates: 15,
    maxActionsPerState: 10,
    timeout: 30_000,
  },
  main: {
    rootSelector: 'main',
    maxDepth: 1,
    maxStates: 10,
    maxActionsPerState: 5,
  },
  header: {
    rootSelector: 'header',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10_000,
  },
  footer: {
    rootSelector: 'footer',
    maxDepth: 1,
    maxStates: 30,
    timeout: 10_000,
  },
  'body-content': {
    rootSelector: '#body',
    maxDepth: 1,
    maxStates: 20,
    timeout: 10_000,
  },
};

function createExplorer(page: import('@playwright/test').Page, overrides: Partial<PartialExplorationConfig>) {
  const config = new ConcreteExplorationConfig({ ...IANA_BASE_CONFIG, ...overrides });
  const testContext = new ConcreteTestContext();
  testContext.page = page;
  const scope = new ConcreteExplorationScope(testContext, config);
  const extractor = new ConcreteDOMExtractor(scope, config);
  const rulesEngine = new ConcreteRulesEngine(config);
  const actionExecutor = new ConcreteActionExecutor(testContext, scope, config);
  const stateManager = new ConcreteStateManager(config);
  const graph = new ConcreteExplorationGraph();
  const explorer = new ConcreteExplorer(
    testContext,
    scope,
    extractor,
    rulesEngine,
    actionExecutor,
    stateManager,
    graph,
    config
  );
  return { explorer, graph, rulesEngine, extractor };
}

function writeJSON(filename: string, data: unknown): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  → ${filePath}`);
}

test.describe('IANA Exploration — Generate', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [scopeName, overrides] of Object.entries(SCOPES)) {
    test(`generate: ${scopeName}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(IANA_URL, { waitUntil: 'load' });

      const { explorer, graph, rulesEngine, extractor } = createExplorer(page, overrides);

      await explorer.explore();

      const summary = explorer.getSummary();
      const exporter = new ConcreteScenarioExporter(graph);

      // Collect initial actions for the root state
      const roots = graph.getRoots();
      const initialFacts = roots.length > 0 ? roots[0].facts : [];
      const actions = await rulesEngine.evaluate(initialFacts);

      writeJSON(`iana-${scopeName}.json`, {
        url: IANA_URL,
        scope: scopeName,
        config: overrides,
        graph: graph.toJSON(),
        summary,
        actions: actions.map((a) => ({
          type: a.type,
          targetUid: (a as { targetUid?: string }).targetUid,
          priority: a.priority,
        })),
        scenarios: exporter.exportScenarios(),
        mermaid: graph.toMermaid(),
        dot: graph.toDOT(),
        generatedAt: new Date().toISOString(),
      });
    });
  }
});
