import { z } from 'zod';

// ============================================================
// Zod v4 schema for validation
// ============================================================

export const ExplorationConfigSchema = z.object({
  // Stratégie d'exploration
  strategy: z.enum(['bfs', 'dfs']).default('bfs'),
  maxDepth: z.number().int().min(0).default(5),
  maxStates: z.number().int().min(1).default(100),
  maxActionsPerState: z.number().int().min(1).default(10),
  timeout: z.number().int().min(1000).default(30_000),

  // Scope
  rootSelector: z.string().min(1).default('body'),
  boundary: z.enum(['strict', 'overflow']).default('strict'),
  overflowSelectors: z.array(z.string()).default(['.cdk-overlay-container']),

  // Filtrage
  ignoreSelectors: z.array(z.string()).default([]),
  ignoreRepeatedElements: z.boolean().default(false),
  maxRepeatPerAction: z.number().int().min(1).default(3),

  // Données de test
  fillValues: z.record(z.string(), z.string()).default({
    text: 'test value',
    email: 'test@example.com',
    password: 'Test1234!',
    search: 'search query',
    tel: '+33600000000',
    url: 'https://example.com',
  }),
  selectStrategy: z.enum(['first', 'random', 'all']).default('first'),

  // Observation
  stabilizationTimeout: z.number().int().min(0).default(500),
  domHashStrategy: z.enum(['structure', 'interactive-only']).default('interactive-only'),
});

/** Inferred raw config type from the Zod schema */
export type ExplorationConfigData = z.infer<typeof ExplorationConfigSchema>;

/** Partial config the user can provide — defaults are filled by Zod */
export type PartialExplorationConfig = z.input<typeof ExplorationConfigSchema>;

// ============================================================
// Default config
// ============================================================

export const defaultExplorationConfig: ExplorationConfigData = ExplorationConfigSchema.parse({});

// ============================================================
// Injectable DI class (abstract + concrete)
// ============================================================

export abstract class ExplorationConfig {
  abstract get strategy(): 'bfs' | 'dfs';
  abstract get maxDepth(): number;
  abstract get maxStates(): number;
  abstract get maxActionsPerState(): number;
  abstract get timeout(): number;

  abstract get rootSelector(): string;
  abstract get boundary(): 'strict' | 'overflow';
  abstract get overflowSelectors(): string[];

  abstract get ignoreSelectors(): string[];
  abstract get ignoreRepeatedElements(): boolean;
  abstract get maxRepeatPerAction(): number;

  abstract get fillValues(): Record<string, string>;
  abstract get selectStrategy(): 'first' | 'random' | 'all';

  abstract get stabilizationTimeout(): number;
  abstract get domHashStrategy(): 'structure' | 'interactive-only';
}

export class ConcreteExplorationConfig extends ExplorationConfig {
  readonly #data: ExplorationConfigData;

  constructor(partial?: PartialExplorationConfig) {
    super();
    this.#data = ExplorationConfigSchema.parse(partial ?? {});
  }

  get strategy() {
    return this.#data.strategy;
  }
  get maxDepth() {
    return this.#data.maxDepth;
  }
  get maxStates() {
    return this.#data.maxStates;
  }
  get maxActionsPerState() {
    return this.#data.maxActionsPerState;
  }
  get timeout() {
    return this.#data.timeout;
  }

  get rootSelector() {
    return this.#data.rootSelector;
  }
  get boundary() {
    return this.#data.boundary;
  }
  get overflowSelectors() {
    return this.#data.overflowSelectors;
  }

  get ignoreSelectors() {
    return this.#data.ignoreSelectors;
  }
  get ignoreRepeatedElements() {
    return this.#data.ignoreRepeatedElements;
  }
  get maxRepeatPerAction() {
    return this.#data.maxRepeatPerAction;
  }

  get fillValues() {
    return this.#data.fillValues;
  }
  get selectStrategy() {
    return this.#data.selectStrategy;
  }

  get stabilizationTimeout() {
    return this.#data.stabilizationTimeout;
  }
  get domHashStrategy() {
    return this.#data.domHashStrategy;
  }
}
