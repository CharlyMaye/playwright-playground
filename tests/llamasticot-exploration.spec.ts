import * as fs from 'fs';
import * as path from 'path';
import { test as baseTest, expect } from '../engine';
import { ExplorationPOM } from '../POM';
import { LLAMASTICOT_TARGETS } from './exploration/llamasticot-targets';

const test = baseTest<ExplorationPOM>(ExplorationPOM);
const { describe } = test;

const DATA_DIR = path.resolve(__dirname, '..', '.exploration-data');

describe('LlamaSticot Exploration — Replay', () => {
  for (const target of LLAMASTICOT_TARGETS) {
    const jsonPath = path.join(DATA_DIR, `llamasticot-${target.name}.json`);

    describe(`target: ${target.name}`, () => {
      test(`replay all scenarios (${target.name})`, {}, async ({ instance, testContext }) => {
        test.setTimeout(120_000);

        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as { graph: { states: unknown[] } };
        expect(data.graph.states.length).toBeGreaterThan(0);

        await instance.load(jsonPath).enableScreenshot().goto().replayAll().execute();

        expect(testContext.page.url()).toBeDefined();
      });
    });
  }
});
