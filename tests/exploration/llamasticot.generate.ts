/**
 * Phase 1 — Exploration generator for LlamaSticot story pages.
 *
 * Run manually:   npm run explore:llama
 * Or directly:    npx playwright test --project=exploration llamasticot.generate
 *
 * Generates JSON files in `.exploration-data/llamasticot-*.json` for each
 * target defined in {@link LLAMASTICOT_TARGETS}.
 *
 * These files are consumed by `tests/llamasticot-exploration.spec.ts` (Phase 2).
 */
import * as fs from 'fs';
import * as path from 'path';
import { explorerTest as test } from '../../explorer/fixture';
import { LLAMASTICOT_TARGETS } from './llamasticot-targets';

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '.exploration-data');

function writeJSON(filename: string, data: unknown): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`  → ${filePath}`);
}

test.describe('LlamaSticot Exploration — Generate', () => {
  test.describe.configure({ mode: 'serial' });

  for (const target of LLAMASTICOT_TARGETS) {
    test.describe(`target: ${target.name}`, () => {
      test.use({
        explorationConfig: target.config,
      });

      test(`generate: ${target.name}`, async ({ explorer, explorationGraph, scenarioExporter, rulesEngine, page }) => {
        test.setTimeout(120_000);

        await page.goto(target.url, { waitUntil: 'load' });

        if (target.preExploreHook) {
          await target.preExploreHook(page);
        }

        await explorer.explore();

        const summary = explorer.getSummary();

        const roots = explorationGraph.getRoots();
        const initialFacts = roots.length > 0 ? roots[0].facts : [];
        const actions = await rulesEngine.evaluate(initialFacts);

        writeJSON(`llamasticot-${target.name}.json`, {
          url: target.url,
          target: target.name,
          config: target.config,
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
