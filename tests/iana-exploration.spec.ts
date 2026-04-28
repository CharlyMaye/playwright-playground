import * as path from 'path';
import { test as baseTest, expect } from '../engine';
import { ExplorationPOM } from '../POM';

const test = baseTest<ExplorationPOM>(ExplorationPOM);
const { describe } = test;

const DATA_DIR = path.resolve(__dirname, '..', '.exploration-data');

const SCOPES = ['body', 'main', 'header', 'footer', 'body-content'] as const;

describe('IANA Exploration — Replay', () => {
  for (const scope of SCOPES) {
    const jsonPath = path.join(DATA_DIR, `iana-${scope}.json`);

    describe(`scope: ${scope}`, () => {
      test(`replay all scenarios (${scope})`, {}, async ({ instance, testContext }) => {
        test.setTimeout(120_000);

        await instance.load(jsonPath).enableScreenshot().goto().replayAll().execute();

        expect(testContext.page.url()).toBeDefined();
      });
    });
  }
});
