import { test as baseTest } from '../engine';
import { AngularMaterialPOM } from '../POM';

const test = baseTest<AngularMaterialPOM>(AngularMaterialPOM);
const { describe } = test;

describe('WIP', () => {
  test('Angular Material WebSite', {}, async ({ instance, expectContext, testContext }) => {
    await instance.goto();
  });
});
