/* eslint-disable playwright/expect-expect */
import { loadAnalysis } from '../analysis/loader';
import { test as baseTest } from '../engine';
import type { Action } from '../engine/execution/action';
import { VisualRegressionPOM } from '../POM';

const test = baseTest<VisualRegressionPOM>(VisualRegressionPOM);
const { describe } = test;

/**
 * Étape 2a — buildScenarios()
 * Les scénarios viennent du JSON (produit par INFERENCE_RULES).
 * EXECUTION_RULES les convertit automatiquement en actions + screenshots.
 * Aucune règle codée en dur.
 */
const pages = [
  {
    name: 'button-examples',
    url: 'https://material.angular.dev/components/button/examples',
    scope: 'mat-card',
  },
  {
    name: 'select-examples',
    url: 'https://material.angular.dev/components/select/overview',
    scope: 'mat-card',
  },
  {
    name: 'checkbox-examples',
    url: 'https://material.angular.dev/components/checkbox/overview',
    scope: 'mat-card',
  },
];

describe('Visual Regression — buildScenarios', () => {
  for (const { name, url, scope } of pages) {
    describe(name, () => {
      test('scenarios', {}, async ({ instance }) => {
        await instance.goto(url);
        const elements = loadAnalysis(name);
        await instance.loadModel(elements).setScope(scope).buildScenarios().execute();
      });
    });
  }
});

/**
 * Étape 2b — addRule() manuel
 * Pour surcharger ou enrichir des scénarios spécifiques
 * au-delà de ce que EXECUTION_RULES produit automatiquement.
 */
const data: { name: string; url: string; scope: string; rules: Action[] }[] = [
  {
    name: 'button-examples',
    url: 'https://material.angular.dev/components/button/examples',
    scope: 'mat-card',
    rules: [{ target: { type: 'button' }, action: 'hover' }],
  },
  {
    name: 'select-examples',
    url: 'https://material.angular.dev/components/select/overview',
    scope: 'mat-card',
    rules: [{ target: { type: 'select' }, action: 'open', priority: 10 }],
  },
  {
    name: 'checkbox-examples',
    url: 'https://material.angular.dev/components/checkbox/overview',
    scope: 'mat-card',
    rules: [{ target: { type: 'checkbox' }, action: 'hover' }],
  },
];

describe('Visual Regression — addRule', () => {
  for (const { name, url, scope, rules } of data) {
    describe(name, () => {
      test('execute rules', {}, async ({ instance }) => {
        await instance.goto(url);
        const elements = loadAnalysis(name);
        let pom = instance.loadModel(elements).setScope(scope);
        for (const rule of rules) {
          pom = pom.addRule(rule);
        }
        await pom.buildRules().execute();
      });
    });
  }
});
