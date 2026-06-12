import { z } from 'zod';

export const ExplorationConfigSchema = z.object({
  // Stratégie d'exploration
  strategy: z.enum(['bfs', 'dfs']).default('bfs'),
  maxDepth: z.number().int().min(0).default(5),
  maxStates: z.number().int().min(1).default(100),
  maxActionsPerState: z.number().int().min(1).default(10),
  timeout: z.number().int().min(1000).default(30_000),

  // Navigation — 'none' (SPA mode, default): any navigation away from the
  // current restore point is a boundary, recorded as __external_navigation__.
  // 'same-application' (crawler mode, for static/multi-page sites): a
  // navigation that stays inside the application (same URL origin on the
  // web — see StateRestorer.isWithinApplication) becomes a discovered state
  // at depth + 1; foreign destinations remain boundaries.
  followNavigation: z.enum(['none', 'same-application']).default('none'),

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

  // Readiness — wait for a CSS selector to be visible before extracting state.
  // When set, this is invoked before the initial extraction, after each action,
  // and after each rollback. Useful for SPAs that emit a "ready" class once
  // Angular/React/Vue have finished rendering (e.g. `dsl-story-shower section.is-ready`).
  readinessSelector: z.string().min(1).optional(),
  readinessTimeout: z.number().int().min(0).default(5_000),

  // Screenshots — opt-in raw PNG captures during exploration (NOT Playwright
  // baseline assertions; nothing fails if a capture changes). Useful to
  // visually document the discovered graph or to debug the exploration.
  //
  // Two independent modes:
  //   - `captureStateScreenshots`: 1 PNG per discovered state, named
  //     `state-<stateId>.png`. Captured after the initial extraction and
  //     after each new state is added to the graph.
  //   - `captureTransitionScreenshots`: 1 PNG after each executed action
  //     (success or failure), named `transition-<index>-<actionType>.png`.
  //
  // Both write to `screenshotsDir` (created if missing). When the directory
  // is omitted, screenshots are silently skipped even if the booleans are on.
  // `screenshotsPrefix` is prepended to every filename to disambiguate when
  // several targets share the same output directory.
  captureStateScreenshots: z.boolean().default(false),
  captureTransitionScreenshots: z.boolean().default(false),
  screenshotsDir: z.string().optional(),
  screenshotsPrefix: z.string().default(''),

  // Rules — when `rules` is set, ONLY those rules are loaded (no defaults).
  // When absent, the built-in DEFAULT_HTML_RULES are loaded automatically.
  // `additionalRules` are appended on top of the active set (defaults or custom).
  rules: z.array(z.any()).optional(),
  additionalRules: z.array(z.any()).optional(),
});

/** Inferred raw config type from the Zod schema */
export type ExplorationConfigData = z.infer<typeof ExplorationConfigSchema>;

/** Partial config the user can provide — defaults are filled by Zod */
export type PartialExplorationConfig = z.input<typeof ExplorationConfigSchema>;

export const defaultExplorationConfig: ExplorationConfigData = ExplorationConfigSchema.parse({});

/**
 * DI token for the exploration config. The getters delegate to the parsed
 * Zod data — implemented once here so concrete subclasses only have to
 * supply the data.
 */
export abstract class ExplorationConfig {
  readonly #data: ExplorationConfigData;

  protected constructor(data: ExplorationConfigData) {
    this.#data = data;
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

  get followNavigation() {
    return this.#data.followNavigation;
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

  get readinessSelector() {
    return this.#data.readinessSelector;
  }
  get readinessTimeout() {
    return this.#data.readinessTimeout;
  }

  get captureStateScreenshots() {
    return this.#data.captureStateScreenshots;
  }
  get captureTransitionScreenshots() {
    return this.#data.captureTransitionScreenshots;
  }
  get screenshotsDir() {
    return this.#data.screenshotsDir;
  }
  get screenshotsPrefix() {
    return this.#data.screenshotsPrefix;
  }

  get rules(): unknown[] | undefined {
    return this.#data.rules;
  }
  get additionalRules(): unknown[] | undefined {
    return this.#data.additionalRules;
  }
}

export class ConcreteExplorationConfig extends ExplorationConfig {
  constructor(partial?: PartialExplorationConfig) {
    super(ExplorationConfigSchema.parse(partial ?? {}));
  }
}
