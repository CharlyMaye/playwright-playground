import { expect, test } from '@playwright/test';
import { ConcreteExplorationConfig, defaultExplorationConfig, ExplorationConfigSchema } from '../ExplorationConfig';

test.describe('ExplorationConfig', () => {
  test.describe('defaultExplorationConfig', () => {
    test('has expected default values', () => {
      expect(defaultExplorationConfig.strategy).toBe('bfs');
      expect(defaultExplorationConfig.maxDepth).toBe(5);
      expect(defaultExplorationConfig.maxStates).toBe(100);
      expect(defaultExplorationConfig.maxActionsPerState).toBe(10);
      expect(defaultExplorationConfig.timeout).toBe(30_000);
      expect(defaultExplorationConfig.rootSelector).toBe('body');
      expect(defaultExplorationConfig.boundary).toBe('strict');
      expect(defaultExplorationConfig.stabilizationTimeout).toBe(500);
      expect(defaultExplorationConfig.domHashStrategy).toBe('interactive-only');
    });
  });

  test.describe('partial merge', () => {
    test('merges partial config with defaults', () => {
      const config = new ConcreteExplorationConfig({ maxDepth: 3, strategy: 'dfs' });
      expect(config.maxDepth).toBe(3);
      expect(config.strategy).toBe('dfs');
      // All other values should be defaults
      expect(config.maxStates).toBe(100);
      expect(config.timeout).toBe(30_000);
      expect(config.rootSelector).toBe('body');
    });

    test('overrides only provided values', () => {
      const config = new ConcreteExplorationConfig({
        rootSelector: '#my-container',
        boundary: 'overflow',
        ignoreSelectors: ['[aria-hidden="true"]'],
      });
      expect(config.rootSelector).toBe('#my-container');
      expect(config.boundary).toBe('overflow');
      expect(config.ignoreSelectors).toEqual(['[aria-hidden="true"]']);
      // Defaults preserved
      expect(config.strategy).toBe('bfs');
      expect(config.maxDepth).toBe(5);
    });

    test('empty partial uses all defaults', () => {
      const config = new ConcreteExplorationConfig({});
      expect(config.strategy).toBe('bfs');
      expect(config.maxDepth).toBe(5);
    });

    test('undefined partial uses all defaults', () => {
      const config = new ConcreteExplorationConfig();
      expect(config.strategy).toBe('bfs');
      expect(config.maxDepth).toBe(5);
    });
  });

  test.describe('Zod validation', () => {
    test('rejects maxDepth < 0', () => {
      expect(() => ExplorationConfigSchema.parse({ maxDepth: -1 })).toThrow();
    });

    test('rejects maxStates < 1', () => {
      expect(() => ExplorationConfigSchema.parse({ maxStates: 0 })).toThrow();
    });

    test('rejects timeout < 1000', () => {
      expect(() => ExplorationConfigSchema.parse({ timeout: 500 })).toThrow();
    });

    test('rejects invalid strategy', () => {
      expect(() => ExplorationConfigSchema.parse({ strategy: 'random' })).toThrow();
    });

    test('rejects invalid boundary', () => {
      expect(() => ExplorationConfigSchema.parse({ boundary: 'loose' })).toThrow();
    });

    test('rejects empty rootSelector', () => {
      expect(() => ExplorationConfigSchema.parse({ rootSelector: '' })).toThrow();
    });

    test('accepts valid complete config', () => {
      const result = ExplorationConfigSchema.parse({
        strategy: 'dfs',
        maxDepth: 10,
        maxStates: 50,
        maxActionsPerState: 5,
        timeout: 5000,
        rootSelector: 'main',
        boundary: 'overflow',
        overflowSelectors: ['.overlay'],
        ignoreSelectors: [],
        ignoreRepeatedElements: true,
        maxRepeatPerAction: 2,
        fillValues: { text: 'hello' },
        selectStrategy: 'all',
        stabilizationTimeout: 200,
        domHashStrategy: 'structure',
      });
      expect(result.strategy).toBe('dfs');
      expect(result.maxDepth).toBe(10);
    });

    test('ConcreteExplorationConfig throws on invalid config', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      expect(() => new ConcreteExplorationConfig({ timeout: 100 } as any)).toThrow();
    });
  });
});
