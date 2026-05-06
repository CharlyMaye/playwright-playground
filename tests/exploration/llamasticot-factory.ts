import type { PartialExplorationConfig } from '../../explorer/ExplorationConfig';
import type { ExplorationTarget } from '../../explorer/types';
import { LLAMASTICOT_BASE_URL, LLAMASTICOT_OVERFLOW_SELECTORS, LLAMASTICOT_READY_SELECTOR, LLAMASTICOT_SCREENSHOTS_DIR, type LlamasticotTargetOptions } from './llamasticot-config';
import { VISUAL_STATE_RULES } from './llamasticot-rules';

/**
 * Builds an {@link ExplorationTarget} for a LlamaSticot story page.
 *
 * Applies sensible defaults:
 * - `rootSelector` and `readinessSelector` both target `section.is-ready`
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
  const paramsSuffix = options.queryParams
    ? '-' +
      Object.entries(options.queryParams)
        .map(([k, v]) => `${k}-${v}`)
        .join('-')
    : '';
  const name = `${slug}${paramsSuffix}-${theme}`;

  const baseUrl = `${LLAMASTICOT_BASE_URL}/${storyPath.replace(/^\/+/, '')}?standalone=true&culture=${culture}&theme=${theme}`;
  const extra = options.queryParams ? '&' + new URLSearchParams(options.queryParams).toString() : '';
  const url = `${baseUrl}${extra}`;

  const config: PartialExplorationConfig = {
    rootSelector: LLAMASTICOT_READY_SELECTOR,
    boundary: 'overflow',
    overflowSelectors: LLAMASTICOT_OVERFLOW_SELECTORS,
    readinessSelector: LLAMASTICOT_READY_SELECTOR,
    readinessTimeout: 8_000,
    stabilizationTimeout: 100,
    strategy: 'bfs',
    maxDepth: 2,
    maxStates: 30,
    maxActionsPerState: 50,
    timeout: 1_000_000,
    domHashStrategy: 'interactive-only',
    additionalRules: VISUAL_STATE_RULES,
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
