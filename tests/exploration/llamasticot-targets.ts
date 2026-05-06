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
import { LLAMASTICOT_OVERFLOW_SELECTORS } from './llamasticot-config';
import { createLlamasticotTarget, createLlamasticotThemeMatrix } from './llamasticot-factory';

export { createLlamasticotTarget, createLlamasticotThemeMatrix };

export const LLAMASTICOT_TARGETS: ExplorationTarget[] = [
  // Baseline target — captures a standard interactive page with the default ruleset.
  createLlamasticotTarget('legacy-button', { theme: 'light', captureScreenshots: false }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false', variant: 'ing-discreet' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true', variant: 'ing-discreet' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false', variant: 'ing-secondary' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true', variant: 'ing-secondary' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false', variant: 'ing-action-standard' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true', variant: 'ing-action-standard' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false', variant: 'ing-action-exceptional' },
  }),
  createLlamasticotTarget('legacy-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true', variant: 'ing-action-exceptional' },
  }),
  //
  createLlamasticotTarget('legacy-tile-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false' },
  }),
  createLlamasticotTarget('legacy-tile-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true' },
  }),
  //
  createLlamasticotTarget('legacy-menutitle-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false' },
  }),
  createLlamasticotTarget('legacy-menutitle-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true' },
  }),
  //
  createLlamasticotTarget('legacy-radio-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false' },
  }),
  createLlamasticotTarget('legacy-radio-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true' },
  }),
  //
  createLlamasticotTarget('legacy-toggle-button', {
    theme: 'light',
    queryParams: { isDisabled: 'false' },
  }),
  createLlamasticotTarget('legacy-toggle-button', {
    theme: 'light',
    queryParams: { isDisabled: 'true' },
  }),
  //
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'text', isDisabled: 'false', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'text', isDisabled: 'true', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'text', isDisabled: 'false', isReadOnly: 'true' },
  }),
  //
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'true', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'true' },
  }),

  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', value: false, isDisabled: 'false', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', value: false, isDisabled: 'true', isReadOnly: 'false' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', value: false, isDisabled: 'false', isReadOnly: 'true' },
  }),

  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'false', isIndeterminate: 'true' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'true', isReadOnly: 'false', isIndeterminate: 'true' },
  }),
  createLlamasticotTarget('legacy-input', {
    theme: 'light',
    queryParams: { type: 'checkbox', isDisabled: 'false', isReadOnly: 'true', isIndeterminate: 'true' },
  }),

  // Legacy anchor — 4 visual variants (no disabled state for <a>)
  createLlamasticotTarget('legacy-anchor', {
    theme: 'light',
    queryParams: { variant: 'ing-href-blue' },
  }),
  createLlamasticotTarget('legacy-anchor', {
    theme: 'light',
    queryParams: { variant: 'ing-href-white' },
  }),
  createLlamasticotTarget('legacy-anchor', {
    theme: 'light',
    queryParams: { variant: 'ing-href-grey' },
  }),
  createLlamasticotTarget('legacy-anchor', {
    theme: 'light',
    queryParams: { variant: '' },
  }),

  // Interactive target — confirms full pipeline (extract → rules → execute → graph).
  createLlamasticotTarget('mat-button', { theme: 'light', captureScreenshots: false }),

  // legacy-text-area — single state (no inputs, always enabled)
  createLlamasticotTarget('legacy-text-area', { theme: 'light' }),

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

  // legacy-menu-contextual — enabled/disabled × default label / custom label
  // ing-menu-base-content is dynamically appended to <demo-app-root> outside section.is-ready,
  // so we add it explicitly to overflowSelectors to allow the explorer to capture opened menu items.
  createLlamasticotTarget('legacy-menu-contextual', {
    theme: 'light',
    queryParams: { disabled: 'false', showCustomLabel: 'false' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, 'ing-menu-base-content'] },
  }),
  createLlamasticotTarget('legacy-menu-contextual', {
    theme: 'light',
    queryParams: { disabled: 'true', showCustomLabel: 'false' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, 'ing-menu-base-content'] },
  }),
  createLlamasticotTarget('legacy-menu-contextual', {
    theme: 'light',
    queryParams: { disabled: 'false', showCustomLabel: 'true' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, 'ing-menu-base-content'] },
  }),
  createLlamasticotTarget('legacy-menu-contextual', {
    theme: 'light',
    queryParams: { disabled: 'true', showCustomLabel: 'true' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, 'ing-menu-base-content'] },
  }),

  // ═══ WIJMO INPUT ═══

  // wijmo-inputnumber
  createLlamasticotTarget('wijmo-inputnumber', { theme: 'light' }),
  createLlamasticotTarget('wijmo-inputnumber', { theme: 'light', queryParams: { isDisabled: 'true' } }),
  createLlamasticotTarget('wijmo-inputnumber', { theme: 'light', queryParams: { isReadOnly: 'true' } }),

  // wijmo-combobox
  createLlamasticotTarget('wijmo-combobox', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, '.wj-dropdown-panel'] },
  }),
  createLlamasticotTarget('wijmo-combobox', { theme: 'light', queryParams: { isDisabled: 'true' } }),
  createLlamasticotTarget('wijmo-combobox', { theme: 'light', queryParams: { isReadOnly: 'true' } }),

  // wijmo-autocomplete
  createLlamasticotTarget('wijmo-autocomplete', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, '.wj-dropdown-panel'] },
  }),
  createLlamasticotTarget('wijmo-autocomplete', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // wijmo-datepicker
  createLlamasticotTarget('wijmo-datepicker', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, '.wj-dropdown-panel'] },
  }),
  createLlamasticotTarget('wijmo-datepicker', { theme: 'light', queryParams: { isDisabled: 'true' } }),
  createLlamasticotTarget('wijmo-datepicker', { theme: 'light', queryParams: { isReadOnly: 'true' } }),

  // wijmo-multiselect
  createLlamasticotTarget('wijmo-multiselect', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS, '.wj-dropdown-panel'] },
  }),
  createLlamasticotTarget('wijmo-multiselect', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // wijmo-listbox
  createLlamasticotTarget('wijmo-listbox', { theme: 'light' }),
  createLlamasticotTarget('wijmo-listbox', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // ═══ WIJMO NAV ═══

  // wijmo-accordion
  createLlamasticotTarget('wijmo-accordion', { theme: 'light' }),
  createLlamasticotTarget('wijmo-accordion', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // wijmo-tabpanel
  createLlamasticotTarget('wijmo-tabpanel', { theme: 'light' }),

  // wijmo-treeview
  createLlamasticotTarget('wijmo-treeview', { theme: 'light' }),
  createLlamasticotTarget('wijmo-treeview', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // ═══ WIJMO CHART (visual only) ═══

  createLlamasticotTarget('wijmo-chart', { theme: 'light', configOverrides: { maxDepth: 0 } }),

  // ═══ MODALS / POPUPS ═══

  createLlamasticotTarget('tools-modal-manager', { theme: 'light' }),
  createLlamasticotTarget('tools-modal-manager/mat', { theme: 'light' }),
  createLlamasticotTarget('wijmo-modal', { theme: 'light' }),

  // ═══ LAYOUTS (visual only, maxDepth: 0) ═══

  createLlamasticotTarget('legacy-layout-master-details', { theme: 'light', configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('legacy-layout-header-body-footer', { theme: 'light', configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('legacy-layout-header-body-footer-with-nav', { theme: 'light', configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('legacy-layout-header-body-footer-groupbox-grid', { theme: 'light', configOverrides: { maxDepth: 0 } }),
];
