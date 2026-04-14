/**
 * Phase 1 — Exploration generator for IANA example-domains page.
 *
 * Run manually:   npm run explore
 * Or directly:    npx playwright test --project=exploration
 *
 * Generates JSON files in .exploration-data/ for each scope.
 * These files are consumed by tests/iana-validation.spec.ts (Phase 2).
 */
import * as fs from 'fs';
import * as path from 'path';
import { PartialExplorationConfig } from '../../explorer/ExplorationConfig';
import { explorerTest as test } from '../../explorer/fixture';

const IANA_URL = 'https://www.iana.org/help/example-domains';
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '.exploration-data');

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

function writeJSON(filename: string, data: unknown): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  → ${filePath}`);
}

test.describe('IANA Exploration — Generate', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [scopeName, overrides] of Object.entries(SCOPES)) {
    test.describe(`scope: ${scopeName}`, () => {
      test.use({
        explorationConfig: {
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
          ...overrides,
        },
      });

      test(`generate: ${scopeName}`, async ({ explorer, explorationGraph, scenarioExporter, rulesEngine, page }) => {
        test.setTimeout(120_000);
        await page.goto(IANA_URL, { waitUntil: 'load' });

        await explorer.explore();

        const summary = explorer.getSummary();

        // Collect initial actions for the root state
        const roots = explorationGraph.getRoots();
        const initialFacts = roots.length > 0 ? roots[0].facts : [];
        const actions = await rulesEngine.evaluate(initialFacts);

        writeJSON(`iana-${scopeName}.json`, {
          url: IANA_URL,
          scope: scopeName,
          config: overrides,
          graph: explorationGraph.toJSON(),
          summary,
          actions: actions.map((a) => ({
            type: a.type,
            targetUid: (a as { targetUid?: string }).targetUid,
            priority: a.priority,
          })),
          scenarios: scenarioExporter.exportScenarios(),
          mermaid: explorationGraph.toMermaid(),
          dot: explorationGraph.toDOT(),
          generatedAt: new Date().toISOString(),
        });
      });
    });
  }
});
