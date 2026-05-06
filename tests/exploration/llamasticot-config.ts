import type { Page } from '@playwright/test';
import * as path from 'path';
import type { PartialExplorationConfig } from '../../explorer/ExplorationConfig';

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
  /** Additional query params appended to the story URL (e.g. `{ isDisabled: 'false', variant: 'ing-action-standard' }`). */
  queryParams?: Record<string, string>;
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
