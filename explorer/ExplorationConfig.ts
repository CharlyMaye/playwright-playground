import { z } from 'zod';

/**
 * Zod schema for the exploration configuration.
 *
 * All properties are optional at input time: default values are applied by
 * Zod during `parse`. Use {@link PartialExplorationConfig} for the input type
 * and {@link ExplorationConfigData} for the resolved type.
 */
export const ExplorationConfigSchema = z.object({
  // ---------------------------------------------------------------------------
  // Exploration strategy
  // ---------------------------------------------------------------------------

  /**
   * Graph traversal algorithm.
   *
   * - `'bfs'` *(default)* — Breadth-First Search: explores all states at
   *   depth N before moving to N+1. Favours broad coverage and guarantees
   *   that the shortest paths are discovered first.
   * - `'dfs'` — Depth-First Search: dives as deep as possible before
   *   backtracking. Useful for following a linear user flow all the way
   *   through before exploring alternative branches.
   *
   * @default 'bfs'
   */
  strategy: z.enum(['bfs', 'dfs']).default('bfs'),

  /**
   * Maximum depth of the exploration graph.
   *
   * A depth of 0 means only the initial state is extracted without executing
   * any action. Each action leading to a new state increments the depth by
   * one. Beyond this threshold, discovered states are recorded in the graph
   * but their actions are no longer explored.
   *
   * @default 5
   */
  maxDepth: z.number().int().min(0).default(5),

  /**
   * Maximum total number of distinct states that can be discovered.
   *
   * Once this quota is reached, the exploration stops even if the frontier
   * is not empty. Allows bounding the duration of an exploration on
   * very rich applications without having to tune {@link maxDepth}.
   *
   * @default 100
   */
  maxStates: z.number().int().min(1).default(100),

  /**
   * Maximum number of actions executed per state.
   *
   * Caps the number of interactions attempted on a given state before moving
   * to the next one in the frontier. Prevents the exploration from stalling
   * on a state that exposes a very large number of controls (e.g. a table
   * with hundreds of clickable rows).
   *
   * @default 10
   */
  maxActionsPerState: z.number().int().min(1).default(10),

  /**
   * Maximum total exploration duration in milliseconds.
   *
   * When this deadline elapses, the exploration is gracefully interrupted and
   * the partial graph is returned. Acts as a safeguard in CI/CD pipelines
   * where a global Playwright timeout could kill the process abruptly.
   *
   * @default 30_000
   */
  timeout: z.number().int().min(1000).default(30_000),

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * Explorer behaviour when a full-page navigation occurs.
   *
   * - `'none'` *(default, SPA mode)* — Any navigation away from the current
   *   restore point is treated as an external boundary and recorded under the
   *   synthetic action `__external_navigation__`. Rollback brings the explorer
   *   back to the original URL. Suited for SPAs (Angular, React, Vue) where
   *   the DOM tree is updated without a page reload.
   * - `'same-application'` *(crawler mode)* — A navigation to a URL on the
   *   same origin is treated as a newly discovered state (depth + 1); external
   *   destinations remain boundaries. Suited for classic multi-page sites or
   *   hybrid applications.
   *
   * @default 'none'
   */
  followNavigation: z.enum(['none', 'same-application']).default('none'),

  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------

  /**
   * CSS selector delimiting the root of the exploration.
   *
   * Only interactive elements that are descendants of this selector are
   * considered during state extraction. Allows restricting the exploration
   * to a section of the page (e.g. `'main'`, `'#app'`, `'dsl-story-shower'`)
   * and ignoring navigation bars, footers, etc.
   *
   * @default 'body'
   */
  rootSelector: z.string().min(1).default('body'),

  /**
   * Strategy for handling elements located outside {@link rootSelector}.
   *
   * - `'strict'` *(default)* — Elements outside the root are completely
   *   ignored during state extraction and hash computation.
   * - `'overflow'` — Selectors listed in {@link overflowSelectors} are also
   *   included. Required for CDK overlays, `mat-select` menus, tooltips, etc.
   *   that are rendered in a portal outside the rootSelector.
   *
   * @default 'strict'
   */
  boundary: z.enum(['strict', 'overflow']).default('strict'),

  /**
   * Additional CSS selectors included in state extraction when {@link boundary}
   * is `'overflow'`.
   *
   * These containers are typically Angular CDK portals
   * (`cdk-overlay-container`) or any other DOM mount point outside
   * {@link rootSelector}. Ignored when `boundary` is `'strict'`.
   *
   * @default ['.cdk-overlay-container']
   */
  overflowSelectors: z.array(z.string()).default(['.cdk-overlay-container']),

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  /**
   * List of CSS selectors whose matching elements are excluded from the
   * exploration (no actions are submitted to them).
   *
   * Useful to ignore unstable controls, cookie banners, logout buttons or
   * any other element that would skew the exploration.
   *
   * @example ['[data-testid="logout-btn"]', '.cookie-banner button']
   * @default []
   */
  ignoreSelectors: z.array(z.string()).default([]),

  /**
   * Enables de-duplication of repeated elements in lists or tables.
   *
   * When `true`, the rules engine detects structurally identical elements
   * (same role, same relative position within their container) and retains
   * at most {@link maxRepeatPerAction} of them. Drastically reduces the
   * exploration space for dynamic lists.
   *
   * @default false
   */
  ignoreRepeatedElements: z.boolean().default(false),

  /**
   * Maximum number of similar occurrences of the same action type per state.
   *
   * Only has effect when {@link ignoreRepeatedElements} is `true`. For
   * example, with `maxRepeatPerAction: 3`, at most 3 clicks on structurally
   * identical rows of a table will be attempted.
   *
   * @default 3
   */
  maxRepeatPerAction: z.number().int().min(1).default(3),

  // ---------------------------------------------------------------------------
  // Test data
  // ---------------------------------------------------------------------------

  /**
   * Dictionary of values injected into input fields during `fill` actions.
   *
   * Keys correspond to the HTML input type (`text`, `email`, `password`,
   * `search`, `tel`, `url`). The associated value is the string typed by
   * the explorer. Can be extended to cover custom types detected by rules.
   *
   * @default \{ text: 'test value', email: 'test@example.com', password: 'Test1234!', search: 'search query', tel: '+33600000000', url: 'https://example.com' \}
   */
  fillValues: z.record(z.string(), z.string()).default({
    text: 'test value',
    email: 'test@example.com',
    password: 'Test1234!',
    search: 'search query',
    tel: '+33600000000',
    url: 'https://example.com',
  }),

  /**
   * Option selection strategy for `<select>` elements.
   *
   * - `'first'` *(default)* — Always selects the first non-disabled option.
   *   Deterministic behaviour, suitable for most cases.
   * - `'random'` — Picks a random option on each run. Increases coverage
   *   over multiple runs but makes the graph non-deterministic.
   * - `'all'` — Generates a distinct action for each option, which may
   *   multiply the number of discovered states.
   *
   * @default 'first'
   */
  selectStrategy: z.enum(['first', 'random', 'all']).default('first'),

  // ---------------------------------------------------------------------------
  // Observation
  // ---------------------------------------------------------------------------

  /**
   * Strategy used to decide the UI has settled after an action, before the
   * next state is extracted.
   *
   * - `'dom-quiet+layout'` *(default)* — Waits until no DOM mutation has
   *   occurred for {@link stabilizationQuietPeriod} ms **and** the root
   *   element's bounding box is stable across two animation frames (catches
   *   CSS transitions). Bounded by {@link stabilizationTimeout}.
   * - `'dom-quiet'` — Same DOM-mutation quiescence, without the layout check.
   *   Lighter, but a pure CSS transition (size/opacity, no DOM change) may not
   *   be awaited.
   * - `'fixed'` — Legacy behaviour: an unconditional wait of exactly
   *   {@link stabilizationTimeout} ms. Use it to reproduce graphs/state hashes
   *   generated before the quiescence-based detection existed.
   *
   * The quiescence modes never wait longer than {@link stabilizationTimeout};
   * worst case (e.g. an endless animation) equals `'fixed'`, best case returns
   * almost immediately.
   *
   * @default 'dom-quiet+layout'
   */
  stabilizationStrategy: z.enum(['fixed', 'dom-quiet', 'dom-quiet+layout']).default('dom-quiet+layout'),

  /**
   * Quiet window in milliseconds with no DOM mutation before the UI is
   * considered settled, in the `'dom-quiet'` / `'dom-quiet+layout'` strategies.
   *
   * Each mutation restarts the window. Lower values make exploration faster but
   * risk capturing mid-update; higher values are safer but slower. Ignored when
   * {@link stabilizationStrategy} is `'fixed'`.
   *
   * @default 100
   */
  stabilizationQuietPeriod: z.number().int().min(0).default(100),

  /**
   * Upper bound in milliseconds for the post-action wait, and per-action
   * operation timeout (click, fill…).
   *
   * In `'fixed'` mode this is the exact, unconditional wait. In the quiescence
   * modes it is the cap: detection returns as soon as the UI is quiet, but
   * never waits longer than this. Too low a cap may cause false positives (two
   * snapshots of the same state appearing different).
   *
   * @default 500
   */
  stabilizationTimeout: z.number().int().min(0).default(500),

  /**
   * Hashing algorithm used to detect duplicate states.
   *
   * - `'interactive-only'` *(default)* — Only interactive elements (buttons,
   *   links, fields) are included in the hash. Robust to dynamic content
   *   changes (dates, counters, messages).
   * - `'structure'` — The entire DOM structure (including text content) is
   *   included in the hash. More precise but sensitive to minor rendering
   *   variations.
   *
   * @default 'interactive-only'
   */
  domHashStrategy: z.enum(['structure', 'interactive-only']).default('interactive-only'),

  // ---------------------------------------------------------------------------
  // Readiness
  // ---------------------------------------------------------------------------

  /**
   * CSS selector whose visibility indicates that the application is ready
   * to be queried.
   *
   * When set, the explorer waits for this element to be visible:
   * - before the initial root state extraction,
   * - after each executed action,
   * - after each rollback.
   *
   * Essential for SPAs (Angular, React, Vue) that display a loading indicator
   * between renders (e.g. `'dsl-story-shower section.is-ready'`). The wait
   * is bounded by {@link readinessTimeout}.
   *
   * @example 'app-root.ng-star-inserted'
   */
  readinessSelector: z.string().min(1).optional(),

  /**
   * Maximum wait duration in milliseconds for {@link readinessSelector} to
   * become visible.
   *
   * If the selector is not visible within this timeout, the exploration
   * throws an error. Has no effect when `readinessSelector` is not set.
   *
   * @default 5_000
   */
  readinessTimeout: z.number().int().min(0).default(5_000),

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  /**
   * Enables a PNG screenshot capture for each discovered state.
   *
   * Files are named `<screenshotsPrefix>state-<stateId>.png` and written to
   * {@link screenshotsDir}. Captured after the initial extraction and each
   * time a new state is added to the graph.
   *
   * These are documentary captures, **not** Playwright visual assertions:
   * no test fails if an image changes.
   *
   * @default false
   */
  captureStateScreenshots: z.boolean().default(false),

  /**
   * Enables a PNG screenshot capture after each executed action.
   *
   * Files are named `<screenshotsPrefix>transition-<index>-<actionType>.png`
   * and written to {@link screenshotsDir}. The capture is taken whether the
   * action succeeded or failed, which helps debug unstable actions.
   *
   * @default false
   */
  captureTransitionScreenshots: z.boolean().default(false),

  /**
   * Destination directory for screenshots.
   *
   * Created automatically if it does not exist. When absent, all captures
   * are silently skipped even if {@link captureStateScreenshots} or
   * {@link captureTransitionScreenshots} are enabled.
   */
  screenshotsDir: z.string().optional(),

  /**
   * Prefix prepended to every screenshot filename.
   *
   * Allows distinguishing captures from multiple exploration targets writing
   * to the same {@link screenshotsDir}.
   *
   * @example 'iana-links-'  →  'iana-links-state-0.png'
   * @default ''
   */
  screenshotsPrefix: z.string().default(''),

  // ---------------------------------------------------------------------------
  // Rules
  // ---------------------------------------------------------------------------

  /**
   * Custom extraction rules to use **instead of** the default HTML rules
   * (`DEFAULT_HTML_RULES`).
   *
   * When this property is set, **only** these rules are loaded; the built-in
   * rules are entirely ignored. To add rules without replacing the defaults,
   * use {@link additionalRules} instead.
   *
   * A rule is an object implementing the `ActionRule` interface of the engine.
   */
  rules: z.array(z.any()).optional(),

  /**
   * Additional extraction rules appended **on top of** the active set
   * (defaults or custom {@link rules}).
   *
   * These rules are evaluated after the main rules and allow extending
   * exploration coverage without rewriting the entire rule configuration
   * (e.g. detecting specific Angular Material components).
   */
  additionalRules: z.array(z.any()).optional(),

  // ---------------------------------------------------------------------------
  // Debug
  // ---------------------------------------------------------------------------

  /**
   * Enables a structured step-by-step exploration log on `stdout`.
   *
   * At each engine iteration (frontier pop, action execution, rollback,
   * result), a JSON line is emitted. Useful for verifying that navigations
   * and rollbacks are actually happening without instrumenting source code.
   *
   * @default false
   */
  debugTrace: z.boolean().default(false),

  /**
   * Amount of per-element detail kept in the serialised graph
   * ({@link ExplorationGraph.toJSON}) and retained in memory after a state has
   * been explored.
   *
   * - `'minimal'` *(default)* — keep only `uid` + `nativeSelector` per fact:
   *   enough to resolve elements during replay, ~10× smaller JSON, and the
   *   heavy fact fields are evicted from the heap once a state leaves the
   *   frontier. Recommended for large pages.
   * - `'none'` — drop facts entirely from the export (smallest output). Replay
   *   then relies solely on the `targetSelector` carried by each action.
   * - `'full'` — keep the complete {@link ElementFact} snapshot for every
   *   state. Useful for debugging, but memory- and disk-heavy on rich pages;
   *   disables heap eviction.
   *
   * @default 'minimal'
   */
  serializeFacts: z.enum(['full', 'minimal', 'none']).default('minimal'),

  // ---------------------------------------------------------------------------
  // HTML graph export
  // ---------------------------------------------------------------------------

  /**
   * Output path for the state graph HTML visualisation file.
   *
   * When set, the explorer generates at the end of `explore()` a
   * self-contained HTML file (inline assets) representing the directed graph
   * of discovered states and transitions. Handy for visually auditing
   * exploration coverage or sharing results with the team.
   *
   * @example './exploration-reports/iana-graph.html'
   */
  graphHtmlPath: z.string().optional(),
});

/**
 * Resolved configuration type inferred from the Zod schema.
 *
 * All optional properties have been replaced by their default values after
 * Zod `parse`. This is the type that circulates internally in the exploration
 * engine.
 *
 * @see {@link PartialExplorationConfig} for the user-facing input type.
 */
export type ExplorationConfigData = z.infer<typeof ExplorationConfigSchema>;

/**
 * Partial input type accepted by {@link ConcreteExplorationConfig}.
 *
 * All properties are optional: missing values are filled with the Zod schema
 * defaults during `parse`. This is the type that should be used in test
 * configuration files.
 *
 * @see {@link ExplorationConfigData} for the fully resolved type.
 */
export type PartialExplorationConfig = z.input<typeof ExplorationConfigSchema>;

/**
 * Configuration instance with all default values applied.
 *
 * Useful for inspecting default values or as a comparison baseline without
 * having to instantiate a {@link ConcreteExplorationConfig}.
 */
export const defaultExplorationConfig: ExplorationConfigData = ExplorationConfigSchema.parse({});

/**
 * DI token and base class for the exploration configuration.
 *
 * This abstract class exposes the properties of {@link ExplorationConfigData}
 * as read-only getters. It serves as both:
 * - an **interface contract** for injected consumers (e.g.
 *   `PlaywrightActionExecutor`, `RulesEngine`, `PlaywrightReadinessChecker`),
 * - a **DI token** in the exploration engine's injection container.
 *
 * Concrete subclasses (see {@link ConcreteExplorationConfig}) supply the data
 * via the protected constructor; getters unconditionally delegate to the
 * private `#data` field with no additional logic.
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

  get stabilizationStrategy() {
    return this.#data.stabilizationStrategy;
  }
  get stabilizationQuietPeriod() {
    return this.#data.stabilizationQuietPeriod;
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

  get serializeFacts() {
    return this.#data.serializeFacts;
  }

  get debugTrace() {
    return this.#data.debugTrace;
  }
  get graphHtmlPath() {
    return this.#data.graphHtmlPath;
  }
}

/**
 * Public concrete implementation of {@link ExplorationConfig}.
 *
 * Accepts a partial configuration in {@link PartialExplorationConfig} format
 * and applies the Zod schema defaults for any missing properties. This is the
 * class that should be instantiated in tests and registered in the DI
 * container.
 *
 * @example
 * ```ts
 * const config = new ConcreteExplorationConfig({
 *   strategy: 'dfs',
 *   maxDepth: 3,
 *   rootSelector: 'app-root',
 * });
 * ```
 */
export class ConcreteExplorationConfig extends ExplorationConfig {
  constructor(partial?: PartialExplorationConfig) {
    super(ExplorationConfigSchema.parse(partial ?? {}));
  }
}
