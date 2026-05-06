/**
 * Default set of LlamaSticot targets explored by `tests/exploration/llamasticot.generate.ts`.
 *
 * Add new entries here to expand coverage.
 * - Use `createLlamasticotTarget` for single-variant targets.
 * - Use `createLlamasticotThemeMatrix` for light + dark.
 *
 * Rules:    see `llamasticot-rules.ts`
 * Config:   see `llamasticot-config.ts`
 * Builders: see `llamasticot-factory.ts`
 */
import type { ExplorationTarget } from '../../explorer/types';
import { createLlamasticotTarget, createLlamasticotThemeMatrix } from './llamasticot-factory';

export { createLlamasticotTarget, createLlamasticotThemeMatrix };

export const LLAMASTICOT_TARGETS: ExplorationTarget[] = [
  // // Baseline target — captures a standard interactive page with the default ruleset.
  // createLlamasticotTarget('legacy-button', { theme: 'light', captureScreenshots: false }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false', variant: 'ing-discreet' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true', variant: 'ing-discreet' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false', variant: 'ing-secondary' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true', variant: 'ing-secondary' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false', variant: 'ing-action-standard' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true', variant: 'ing-action-standard' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false', variant: 'ing-action-exceptional' },
  // }),
  // createLlamasticotTarget('legacy-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true', variant: 'ing-action-exceptional' },
  // }),
  // //
  // createLlamasticotTarget('legacy-tile-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false' },
  // }),
  // createLlamasticotTarget('legacy-tile-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true' },
  // }),
  // //
  // createLlamasticotTarget('legacy-menutitle-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false' },
  // }),
  // createLlamasticotTarget('legacy-menutitle-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true' },
  // }),
  // //
  // createLlamasticotTarget('legacy-radio-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false' },
  // }),
  // createLlamasticotTarget('legacy-radio-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true' },
  // }),
  // //
  // createLlamasticotTarget('legacy-toggle-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'false' },
  // }),
  // createLlamasticotTarget('legacy-toggle-button', {
  //   theme: 'light',
  //   queryParams: { isDisabled: 'true' },
  // }),
  // //
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'text', isDisabled: 'false', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'text', isDisabled: 'true', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'text', isDisabled: 'false', isReadOnly: 'true' },
  // }),
  // //
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'true', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'true' },
  // }),

  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', value: false, isDisabled: 'false', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', value: false, isDisabled: 'true', isReadOnly: 'false' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', value: false, isDisabled: 'false', isReadOnly: 'true' },
  // }),

  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'false', isIndeterminate: 'true' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'true', isReadOnly: 'false', isIndeterminate: 'true' },
  // }),
  // createLlamasticotTarget('legacy-input', {
  //   theme: 'light',
  //   queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'true', isIndeterminate: 'true' },
  // }),

  // // Legacy anchor — 4 visual variants (no disabled state for <a>)
  // createLlamasticotTarget('legacy-anchor', {
  //   theme: 'light',
  //   queryParams: { variant: 'ing-href-blue' },
  // }),
  // createLlamasticotTarget('legacy-anchor', {
  //   theme: 'light',
  //   queryParams: { variant: 'ing-href-white' },
  // }),
  // createLlamasticotTarget('legacy-anchor', {
  //   theme: 'light',
  //   queryParams: { variant: 'ing-href-grey' },
  // }),
  // createLlamasticotTarget('legacy-anchor', {
  //   theme: 'light',
  //   queryParams: { variant: '' },
  // }),

  // // Interactive target — confirms full pipeline (extract → rules → execute → graph).
  // createLlamasticotTarget('mat-button', { theme: 'light', captureScreenshots: false }),

  // // legacy-text-area — single state (no inputs, always enabled)
  // createLlamasticotTarget('legacy-text-area', { theme: 'light' }),

  // legacy-groupbox — 4 visual variants (default, ing-simple, ing-container, ing-tile)
  createLlamasticotTarget('legacy-groupbox', {
    theme: 'light',
    queryParams: { variant: '' },
  }),
  createLlamasticotTarget('legacy-groupbox', {
    theme: 'light',
    queryParams: { variant: 'ing-simple' },
  }),
  createLlamasticotTarget('legacy-groupbox', {
    theme: 'light',
    queryParams: { variant: 'ing-container' },
  }),
  createLlamasticotTarget('legacy-groupbox', {
    theme: 'light',
    queryParams: { variant: 'ing-tile' },
  }),
];
