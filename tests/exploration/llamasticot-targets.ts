/**
 * LlamaSticot-specific exploration targets.
 *
 * This file is **outside** `explorer/` on purpose: the explorer engine is
 * application-agnostic; all app-specific presets live next to their consumers.
 */
import type { Page } from '@playwright/test';
import * as path from 'path';
import type { PartialExplorationConfig } from '../../explorer/ExplorationConfig';
import type { ExplorationTarget } from '../../explorer/types';

// ============================================================
// LlamaSticot presets
// ============================================================

/**
 * Default base URL for the local LlamaSticot demo app.
 * Override via the `LLAMASTICOT_BASE_URL` environment variable.
 */
export const LLAMASTICOT_BASE_URL = process.env['LLAMASTICOT_BASE_URL'] ?? 'http://localhost:4206';

/**
 * CSS selector that LlamaSticot's `story-shower-layout` exposes
 * once Angular has finished rendering the active story.
 *
 * The hierarchy is:
 * ```html
 * <section class="is-ready">    <!-- class added when rendered -->
 *   <dsl-story-shower>           <!-- renders the actual story -->
 *     ... story content ...
 *   </dsl-story-shower>
 * </section>
 * ```
 *
 * Used as both `readinessSelector` (wait for `is-ready`) and as the
 * `rootSelector` (scope extraction to the rendered story subtree).
 */
export const LLAMASTICOT_READY_SELECTOR = 'section.is-ready';

/**
 * Overflow containers used by Angular Material (CDK) and Wijmo popups.
 * These are added to `overflowSelectors` so the explorer can detect
 * dropdowns / dialogs / tooltips that render outside the root scope.
 */
export const LLAMASTICOT_OVERFLOW_SELECTORS = ['.cdk-overlay-container', '.wj-popup', '.wj-listbox', '.wj-flexgrid-cell-overlay'];

/**
 * Default directory where opt-in screenshots are written when
 * `captureScreenshots: true` is passed to {@link createLlamasticotTarget}.
 */
export const LLAMASTICOT_SCREENSHOTS_DIR = path.resolve(__dirname, '..', '..', '.exploration-data', 'screenshots');

export type LlamasticotTargetOptions = {
  /** Color scheme variant. Appended to the URL via `theme=`. Default: `'light'`. */
  theme?: 'light' | 'dark';
  /** Culture code (i18n). Default: `'fr-FR'`. */
  culture?: string;
  /** Per-target overrides applied on top of the LlamaSticot preset. */
  configOverrides?: Partial<PartialExplorationConfig>;
  /** Optional hook executed after `goto` and before `explore`. */
  preExploreHook?: (page: Page) => Promise<void>;
  /**
   * When `true`, enables BOTH `captureStateScreenshots` and
   * `captureTransitionScreenshots` and points `screenshotsDir` at
   * {@link LLAMASTICOT_SCREENSHOTS_DIR}. The target name is used as
   * `screenshotsPrefix` so multiple targets can share the same folder.
   * Default: `false` (no screenshots).
   */
  captureScreenshots?: boolean;
};

/**
 * Builds an {@link ExplorationTarget} for a LlamaSticot story page.
 *
 * Applies sensible defaults:
 * - `rootSelector` and `readinessSelector` both target `dsl-story-shower section.is-ready`
 * - `boundary: 'overflow'` with CDK + Wijmo overflow containers
 * - `?standalone=true` to hide the shell (toolbar + sidebar)
 *
 * @example
 * ```ts
 * createLlamasticotTarget('legacy-button/secondary-disabled', { theme: 'light' });
 * // → name: 'legacy-button-secondary-disabled-light'
 * //   url:  'http://localhost:4206/legacy-button/secondary-disabled?standalone=true&culture=fr-FR&theme=light'
 * ```
 */
export function createLlamasticotTarget(storyPath: string, options: LlamasticotTargetOptions = {}): ExplorationTarget {
  const theme = options.theme ?? 'light';
  const culture = options.culture ?? 'fr-FR';
  const overrides = options.configOverrides ?? {};

  const slug = storyPath.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
  const name = `${slug}-${theme}`;

  const url = `${LLAMASTICOT_BASE_URL}/${storyPath.replace(/^\/+/, '')}?standalone=true&culture=${culture}&theme=${theme}`;

  const config: PartialExplorationConfig = {
    rootSelector: LLAMASTICOT_READY_SELECTOR,
    boundary: 'overflow',
    overflowSelectors: LLAMASTICOT_OVERFLOW_SELECTORS,
    readinessSelector: LLAMASTICOT_READY_SELECTOR,
    readinessTimeout: 8_000,
    stabilizationTimeout: 400,
    strategy: 'bfs',
    maxDepth: 2,
    maxStates: 30,
    maxActionsPerState: 10,
    timeout: 30_000,
    domHashStrategy: 'interactive-only',
    captureStateScreenshots: options.captureScreenshots ?? false,
    captureTransitionScreenshots: options.captureScreenshots ?? false,
    screenshotsDir: options.captureScreenshots ? LLAMASTICOT_SCREENSHOTS_DIR : undefined,
    screenshotsPrefix: options.captureScreenshots ? name : '',
    ...overrides,
  };

  return {
    name,
    url,
    config,
    preExploreHook: options.preExploreHook,
  };
}

/**
 * Convenience: build both light & dark variants of a story.
 */
export function createLlamasticotThemeMatrix(storyPath: string, options: Omit<LlamasticotTargetOptions, 'theme'> = {}): ExplorationTarget[] {
  return (['light', 'dark'] as const).map((theme) => createLlamasticotTarget(storyPath, { ...options, theme }));
}

// ============================================================
// Default LlamaSticot exploration set
// ============================================================

/**
 * Default set of LlamaSticot targets explored by `tests/exploration/llamasticot.generate.ts`.
 *
 * Add new entries here to expand coverage. Use `createLlamasticotTarget` for
 * single-variant targets or `createLlamasticotThemeMatrix` for light + dark.
 */
export const LLAMASTICOT_TARGETS: ExplorationTarget[] = [
  // Validation target — explicitly requested for the readiness/overflow checks.
  // This page renders a single disabled secondary button: 1 state, 0 actions
  // (disabled elements are filtered by RulesEngine). Confirms readiness wiring.
  createLlamasticotTarget('legacy-button/secondary-disabled', { theme: 'light', captureScreenshots: true }),
  // Interactive target — confirms full pipeline (extract → rules → execute → graph).
  createLlamasticotTarget('mat-button', { theme: 'light', captureScreenshots: true }),
];
