import type { ElementModel, InteractionModel } from './interaction-model';

/**
 * A serializable inference rule.
 * Both `match` and `produce` are stringified and executed inside page.evaluate().
 * They must NOT reference any external closures or Node.js APIs.
 */
export type InferenceRule = {
  match: (el: Element) => boolean;
  produce: (el: Element, index: number) => Partial<ElementModel>;
};

function buildKey(el: Element, index: number): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.replace(/\s+/g, '-').toLowerCase();
  const id = el.getAttribute('id');
  if (id) return id;
  const name = el.getAttribute('name');
  if (name) return name;
  return `element-${index}`;
}

function buildSelector(el: Element): string {
  const id = el.getAttribute('id');
  if (id) return `#${id}`;
  const dataTestId = el.getAttribute('data-testid');
  if (dataTestId) return `[data-testid="${dataTestId}"]`;
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return `[aria-label="${ariaLabel}"]`;
  const name = el.getAttribute('name');
  if (name) return `[name="${name}"]`;
  return el.tagName.toLowerCase();
}

export const INFERENCE_RULES: InferenceRule[] = [
  // mat-select
  {
    match: (el) => el.tagName.toLowerCase() === 'mat-select',
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['open', 'select'],
        states: ['closed', 'open', 'disabled'],
        scenarios: [
          { name: 'open', steps: [{ type: 'click' }] },
          { name: 'select', steps: [{ type: 'open' }, { type: 'select' }] },
        ],
      };
      return {
        key: buildKey(el, index),
        type: 'select',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // matInput (input or textarea with matInput attribute)
  {
    match: (el) => {
      const tag = el.tagName.toLowerCase();
      return (tag === 'input' || tag === 'textarea') && el.hasAttribute('matinput');
    },
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['fill', 'focus'],
        states: ['empty', 'filled', 'focused', 'disabled'],
        scenarios: [{ name: 'fill', steps: [{ type: 'focus' }, { type: 'fill' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'input-text',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? undefined,
        interactionModel,
      };
    },
  },

  // plain input (no matInput)
  {
    match: (el) => {
      const tag = el.tagName.toLowerCase();
      return tag === 'input' && !el.hasAttribute('matinput');
    },
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['fill', 'focus'],
        states: ['empty', 'filled', 'focused', 'disabled'],
        scenarios: [{ name: 'fill', steps: [{ type: 'focus' }, { type: 'fill' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'input-text',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? undefined,
        interactionModel,
      };
    },
  },

  // button (native + Angular Material variants)
  {
    match: (el) => {
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'button' ||
        el.hasAttribute('mat-button') ||
        el.hasAttribute('mat-raised-button') ||
        el.hasAttribute('mat-flat-button') ||
        el.hasAttribute('mat-stroked-button') ||
        el.hasAttribute('mat-icon-button') ||
        el.hasAttribute('mat-fab') ||
        el.hasAttribute('mat-mini-fab')
      );
    },
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['click', 'hover', 'focus'],
        states: ['default', 'hover', 'focus', 'active', 'disabled'],
        scenarios: [
          { name: 'hover', steps: [{ type: 'hover' }] },
          { name: 'click', steps: [{ type: 'click' }] },
        ],
      };
      const label = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? undefined;
      return {
        key: buildKey(el, index),
        type: 'button',
        selector: buildSelector(el),
        label: label || undefined,
        interactionModel,
      };
    },
  },

  // mat-checkbox
  {
    match: (el) => el.tagName.toLowerCase() === 'mat-checkbox',
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['toggle', 'focus'],
        states: ['unchecked', 'checked', 'indeterminate', 'disabled'],
        scenarios: [{ name: 'toggle', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'checkbox',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // mat-slide-toggle
  {
    match: (el) => el.tagName.toLowerCase() === 'mat-slide-toggle',
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['toggle'],
        states: ['off', 'on', 'disabled'],
        scenarios: [{ name: 'toggle', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'toggle',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // mat-radio-button
  {
    match: (el) => el.tagName.toLowerCase() === 'mat-radio-button',
    produce: (el, index) => {
      const interactionModel: InteractionModel = {
        capabilities: ['click', 'focus'],
        states: ['unchecked', 'checked', 'disabled'],
        scenarios: [{ name: 'select', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'radio',
        selector: buildSelector(el),
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },
];
