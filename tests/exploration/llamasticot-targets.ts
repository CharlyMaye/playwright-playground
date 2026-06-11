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

  // ═══════════════════════════════════════════════════════════
  // ANGULAR MATERIAL
  // ═══════════════════════════════════════════════════════════

  // ─── mat-button ─── (9 variants × enabled/disabled)
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'text' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'text', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'elevated' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'elevated', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'outlined' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'outlined', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'filled' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'filled', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'tonal' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'tonal', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'icon' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'icon', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'fab' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'fab', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'mini-fab' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'mini-fab', disabled: 'true' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'extended-fab' } }),
  createLlamasticotTarget('mat-button', { theme: 'light', queryParams: { variant: 'extended-fab', disabled: 'true' } }),

  // ─── mat-card ───
  createLlamasticotTarget('mat-card', { theme: 'light' }),
  createLlamasticotTarget('mat-card/raw', { theme: 'light', configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-card/v2', { theme: 'light' }),

  // ─── mat-input ───
  createLlamasticotTarget('mat-input', { theme: 'light' }),
  createLlamasticotTarget('mat-input', { theme: 'light', queryParams: { isDisabled: 'true' } }),
  createLlamasticotTarget('mat-input', { theme: 'light', queryParams: { isReadOnly: 'true' } }),
  createLlamasticotTarget('mat-input', { theme: 'light', queryParams: { hasError: 'true' } }),

  // ─── mat-select ───
  createLlamasticotTarget('mat-select', { theme: 'light' }),
  createLlamasticotTarget('mat-select', { theme: 'light', queryParams: { isDisabled: 'true' } }),

  // ─── mat-checkbox ───
  createLlamasticotTarget('mat-checkbox', { theme: 'light' }),
  createLlamasticotTarget('mat-checkbox', { theme: 'light', queryParams: { checked: 'true' } }),
  createLlamasticotTarget('mat-checkbox', { theme: 'light', queryParams: { indeterminate: 'true' } }),
  createLlamasticotTarget('mat-checkbox', { theme: 'light', queryParams: { disabled: 'true' } }),
  createLlamasticotTarget('mat-checkbox', { theme: 'light', queryParams: { checked: 'true', disabled: 'true' } }),

  // ─── mat-radio-button ───
  createLlamasticotTarget('mat-radio-button', { theme: 'light' }),
  createLlamasticotTarget('mat-radio-button', { theme: 'light', queryParams: { disabled: 'true' } }),

  // ─── mat-slide-toggle ───
  createLlamasticotTarget('mat-slide-toggle', { theme: 'light' }),
  createLlamasticotTarget('mat-slide-toggle', { theme: 'light', queryParams: { checked: 'true' } }),
  createLlamasticotTarget('mat-slide-toggle', { theme: 'light', queryParams: { disabled: 'true' } }),
  createLlamasticotTarget('mat-slide-toggle', { theme: 'light', queryParams: { checked: 'true', disabled: 'true' } }),

  // ─── mat-slider ───
  createLlamasticotTarget('mat-slider', { theme: 'light', queryParams: { type: 'single' } }),
  createLlamasticotTarget('mat-slider', { theme: 'light', queryParams: { type: 'single', disabled: 'true' } }),
  createLlamasticotTarget('mat-slider', { theme: 'light', queryParams: { type: 'range' } }),
  createLlamasticotTarget('mat-slider', { theme: 'light', queryParams: { type: 'range', disabled: 'true' } }),

  // ─── mat-progress-bar ───
  createLlamasticotTarget('mat-progress-bar', { theme: 'light', queryParams: { mode: 'determinate' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-progress-bar', { theme: 'light', queryParams: { mode: 'indeterminate' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-progress-bar', { theme: 'light', queryParams: { mode: 'buffer' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-progress-bar', { theme: 'light', queryParams: { mode: 'query' }, configOverrides: { maxDepth: 0 } }),

  // ─── mat-progress-spinner ───
  createLlamasticotTarget('mat-progress-spinner', { theme: 'light', queryParams: { mode: 'determinate' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-progress-spinner', { theme: 'light', queryParams: { mode: 'indeterminate' }, configOverrides: { maxDepth: 0 } }),

  // ─── mat-badge ───
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'button', color: 'primary' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'button', color: 'accent' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'button', color: 'warn' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'icon', color: 'primary' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'icon', color: 'accent' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-badge', { theme: 'light', queryParams: { target: 'icon', color: 'warn' }, configOverrides: { maxDepth: 0 } }),

  // ─── mat-divider ───
  createLlamasticotTarget('mat-divider', { theme: 'light', queryParams: { orientation: 'horizontal' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-divider', { theme: 'light', queryParams: { orientation: 'horizontal', inset: 'true' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-divider', { theme: 'light', queryParams: { orientation: 'vertical' }, configOverrides: { maxDepth: 0 } }),

  // ─── mat-icon ───
  createLlamasticotTarget('mat-icon', { theme: 'light', configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-icon', { theme: 'light', queryParams: { color: 'primary' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-icon', { theme: 'light', queryParams: { color: 'accent' }, configOverrides: { maxDepth: 0 } }),
  createLlamasticotTarget('mat-icon', { theme: 'light', queryParams: { color: 'warn' }, configOverrides: { maxDepth: 0 } }),

  // ─── mat-toolbar ───
  createLlamasticotTarget('mat-toolbar', { theme: 'light' }),
  createLlamasticotTarget('mat-toolbar', { theme: 'light', queryParams: { color: 'primary' } }),
  createLlamasticotTarget('mat-toolbar', { theme: 'light', queryParams: { color: 'accent' } }),
  createLlamasticotTarget('mat-toolbar', { theme: 'light', queryParams: { color: 'warn' } }),

  // ─── mat-chips ───
  createLlamasticotTarget('mat-chips', { theme: 'light', queryParams: { type: 'display' } }),
  createLlamasticotTarget('mat-chips', { theme: 'light', queryParams: { type: 'selectable' } }),
  createLlamasticotTarget('mat-chips', { theme: 'light', queryParams: { type: 'removable' } }),

  // ─── mat-list ───
  createLlamasticotTarget('mat-list', { theme: 'light', queryParams: { type: 'basic' } }),
  createLlamasticotTarget('mat-list', { theme: 'light', queryParams: { type: 'icon' } }),
  createLlamasticotTarget('mat-list', { theme: 'light', queryParams: { type: 'nav' } }),

  // ─── mat-grid-list (visual only) ───
  createLlamasticotTarget('mat-grid-list', { theme: 'light', configOverrides: { maxDepth: 0 } }),

  // ─── mat-autocomplete (CDK overlay) ───
  createLlamasticotTarget('mat-autocomplete', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),

  // ─── mat-datepicker (CDK overlay) ───
  createLlamasticotTarget('mat-datepicker', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),
  createLlamasticotTarget('mat-datepicker', { theme: 'light', queryParams: { disabled: 'true' } }),
  createLlamasticotTarget('mat-datepicker', { theme: 'light', queryParams: { readonly: 'true' } }),

  // ─── mat-menu (CDK overlay) ───
  createLlamasticotTarget('mat-menu', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),
  createLlamasticotTarget('mat-menu', { theme: 'light', queryParams: { disabled: 'true' } }),

  // ─── mat-snackbar (CDK overlay) ───
  createLlamasticotTarget('mat-snackbar', {
    theme: 'light',
    queryParams: { type: 'basic' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),
  createLlamasticotTarget('mat-snackbar', {
    theme: 'light',
    queryParams: { type: 'with-action' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),

  // ─── mat-tooltip (hover triggers via VISUAL_STATE_RULES) ───
  createLlamasticotTarget('mat-tooltip', { theme: 'light', queryParams: { position: 'above' } }),
  createLlamasticotTarget('mat-tooltip', { theme: 'light', queryParams: { position: 'below' } }),
  createLlamasticotTarget('mat-tooltip', { theme: 'light', queryParams: { position: 'left' } }),
  createLlamasticotTarget('mat-tooltip', { theme: 'light', queryParams: { position: 'right' } }),
  createLlamasticotTarget('mat-tooltip', { theme: 'light', queryParams: { position: 'above', disabled: 'true' } }),

  // ─── mat-tabs ───
  createLlamasticotTarget('mat-tabs', { theme: 'light', configOverrides: { maxDepth: 1 } }),

  // ─── mat-expansion-panel ───
  createLlamasticotTarget('mat-expansion-panel', { theme: 'light' }),

  // ─── mat-stepper ───
  createLlamasticotTarget('mat-stepper', { theme: 'light', queryParams: { orientation: 'horizontal' } }),
  createLlamasticotTarget('mat-stepper', { theme: 'light', queryParams: { orientation: 'vertical' } }),

  // ─── mat-sidenav ───
  createLlamasticotTarget('mat-sidenav', { theme: 'light', queryParams: { mode: 'side' }, configOverrides: { maxDepth: 1 } }),
  createLlamasticotTarget('mat-sidenav', { theme: 'light', queryParams: { mode: 'over' }, configOverrides: { maxDepth: 1 } }),
  createLlamasticotTarget('mat-sidenav', { theme: 'light', queryParams: { mode: 'push' }, configOverrides: { maxDepth: 1 } }),

  // ─── mat-bottom-sheet (CDK overlay) ───
  createLlamasticotTarget('mat-bottom-sheet', {
    theme: 'light',
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),

  // ─── mat-dialog (CDK overlay) ───
  createLlamasticotTarget('mat-dialog', {
    theme: 'light',
    queryParams: { type: 'basic' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),
  createLlamasticotTarget('mat-dialog', {
    theme: 'light',
    queryParams: { type: 'fullscreen' },
    configOverrides: { overflowSelectors: [...LLAMASTICOT_OVERFLOW_SELECTORS] },
  }),

  // ─── mat-table ───
  createLlamasticotTarget('mat-table', { theme: 'light', configOverrides: { maxDepth: 1 } }),

  // ─── mat-paginator ───
  createLlamasticotTarget('mat-paginator', { theme: 'light' }),

  // ─── mat-tree ───
  createLlamasticotTarget('mat-tree', { theme: 'light' }),
];
