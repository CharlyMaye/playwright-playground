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
import { graphToDOT, graphToMermaid, serializeGraph } from '../../explorer/GraphSerializer';

// const IANA_URL = 'https://www.iana.org/help/example-domains';
const IANA_URL = 'https://www.iana.org';
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '.exploration-data');

const DEFAULT_EXPLORATION_CONFIGURATION: PartialExplorationConfig = {
  boundary: 'strict',
  strategy: 'bfs',
  maxDepth: 5,
  maxStates: 100,
  maxActionsPerState: 100,
  timeout: 600_000,
  stabilizationTimeout: 0,
  domHashStrategy: 'interactive-only',
  // Keep only uid + nativeSelector per element in the output (and evict the
  // heavy snapshots from the heap during exploration) — on pages with
  // thousands of elements the full facts blow up both memory and JSON size.
  serializeFacts: 'minimal',
  ignoreSelectors: [],
  ignoreRepeatedElements: false,
  fillValues: {},
  selectStrategy: 'first',
  debugTrace: true,
  followNavigation: 'same-application',
  // Screenshots
  captureStateScreenshots: false,
  captureTransitionScreenshots: false,
  screenshotsDir: path.join(OUTPUT_DIR, 'screenshots'),
  screenshotsPrefix: 'iana',
};

/** Scopes to explore — each produces a separate JSON file and a separate HTML graph. */
const SCOPES: Record<string, Partial<PartialExplorationConfig>> = {
  body: {
    rootSelector: 'body',
    // Static multi-page site: without this, every link click is recorded as
    // __external_navigation__ and maxDepth/maxStates never come into play.
    graphHtmlPath: path.join(OUTPUT_DIR, 'graph-body.html'),
    screenshotsDir: path.join(OUTPUT_DIR, 'screenshots-body'),
  },
  main: {
    rootSelector: 'main',
    graphHtmlPath: path.join(OUTPUT_DIR, 'graph-main.html'),
    screenshotsDir: path.join(OUTPUT_DIR, 'screenshots-main'),
  },
  header: {
    rootSelector: 'header',
    graphHtmlPath: path.join(OUTPUT_DIR, 'graph-header.html'),
    screenshotsDir: path.join(OUTPUT_DIR, 'screenshots-header'),
  },
  footer: {
    rootSelector: 'footer',
    graphHtmlPath: path.join(OUTPUT_DIR, 'graph-footer.html'),
    screenshotsDir: path.join(OUTPUT_DIR, 'screenshots-footer'),
  },
  'body-content': {
    rootSelector: '#body',
    graphHtmlPath: path.join(OUTPUT_DIR, 'graph-body-content.html'),
    screenshotsDir: path.join(OUTPUT_DIR, 'screenshots-body-content'),
  },
};

function writeJSON(filename: string, data: unknown): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, filename);
  // Compact (no indentation): these files are machine-consumed by the replay
  // POM; pretty-printing roughly doubles size and the peak string allocation.
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`  → ${filePath}`);
}

test.describe('IANA Exploration — Generate', () => {
  test.describe.configure({ mode: 'serial' });

  for (const [scopeName, overrides] of Object.entries(SCOPES)) {
    test.describe(`scope: ${scopeName}`, () => {
      test.use({
        explorationConfig: {
          ...DEFAULT_EXPLORATION_CONFIGURATION,
          ...overrides,
        },
      });

      test(`generate: ${scopeName}`, async ({ explorer, explorationGraph, scenarioExporter, page }) => {
        const explorationTimeout = overrides.timeout ?? DEFAULT_EXPLORATION_CONFIGURATION.timeout ?? 30_000;
        // The exploration timeout is only checked between actions: on a live
        // site one in-flight cycle (click + extract a heavy destination page +
        // rollback goto) can overshoot it by tens of seconds — especially in
        // followNavigation mode where destination pages are fully extracted.
        test.setTimeout(explorationTimeout);
        await page.goto(IANA_URL, { waitUntil: 'load' });

        await explorer.explore();

        const summary = explorer.getSummary();
        const serializeFacts = overrides.serializeFacts ?? DEFAULT_EXPLORATION_CONFIGURATION.serializeFacts ?? 'minimal';

        // Collect initial actions for the root state
        writeJSON(`iana-${scopeName}.json`, {
          url: IANA_URL,
          target: scopeName,
          config: overrides,
          graph: serializeGraph(explorationGraph, { facts: serializeFacts }),
          summary,
          scenarios: scenarioExporter.exportScenarios(),
          mermaid: graphToMermaid(explorationGraph),
          dot: graphToDOT(explorationGraph),
          generatedAt: new Date().toISOString(),
        });
      });
    });
  }
});
