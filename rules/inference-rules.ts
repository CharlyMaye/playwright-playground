import { buildKey, buildSelector } from '../engine/dom-analyzer/helpers';
import type { InferenceRule, InteractionModel } from '../engine/dom-analyzer/interaction-model';

export { buildKey, buildSelector };

// ─── Inference Rules ─────────────────────────────────────────────────────────

export const INFERENCE_RULES: InferenceRule[] = [
  // mat-select
  {
    name: 'mat-select',
    match: (el) => el.tagName.toLowerCase() === 'mat-select',
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(
        `[InferenceRule:mat-select] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`
      );
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
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // matInput (input or textarea with matInput attribute)
  {
    name: 'mat-input',
    match: (el) => {
      const tag = el.tagName.toLowerCase();
      return (tag === 'input' || tag === 'textarea') && el.hasAttribute('matinput');
    },
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(
        `[InferenceRule:mat-input] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`
      );
      const interactionModel: InteractionModel = {
        capabilities: ['fill', 'focus'],
        states: ['empty', 'filled', 'focused', 'disabled'],
        scenarios: [{ name: 'fill', steps: [{ type: 'focus' }, { type: 'fill' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'input-text',
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? undefined,
        interactionModel,
      };
    },
  },

  // plain input (no matInput)
  {
    name: 'input',
    match: (el) => {
      const tag = el.tagName.toLowerCase();
      return tag === 'input' && !el.hasAttribute('matinput');
    },
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(`[InferenceRule:input] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`);
      const interactionModel: InteractionModel = {
        capabilities: ['fill', 'focus'],
        states: ['empty', 'filled', 'focused', 'disabled'],
        scenarios: [{ name: 'fill', steps: [{ type: 'focus' }, { type: 'fill' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'input-text',
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? undefined,
        interactionModel,
      };
    },
  },

  // button (native + Angular Material variants)
  {
    name: 'button',
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
      // Angular Material button variants — rule-specific selector logic
      const tag = el.tagName.toLowerCase();
      const matButtonAttrs = [
        'mat-raised-button',
        'mat-flat-button',
        'mat-stroked-button',
        'mat-button',
        'mat-icon-button',
        'mat-fab',
        'mat-mini-fab',
      ];
      let selector: string;
      let strategy: string;
      const matchedAttr = matButtonAttrs.find((a) => el.hasAttribute(a));
      if (matchedAttr) {
        const siblings = el.parentElement
          ? Array.from(el.parentElement.querySelectorAll(`${tag}[${matchedAttr}]`))
          : [];
        const pos = siblings.indexOf(el) + 1;
        const suffix = pos > 1 ? `:nth-of-type(${pos})` : '';
        selector = `${tag}[${matchedAttr}]${suffix}`;
        strategy = `mat-attr:${matchedAttr}`;
      } else {
        ({ selector, strategy } = buildSelector(el));
      }
      const label = el.getAttribute('aria-label') ?? el.textContent?.trim() ?? undefined;
      console.log(
        `[InferenceRule:button] key="${buildKey(el, index)}" label="${label ?? ''}" selector="${selector}" strategy="${strategy}"`
      );
      const interactionModel: InteractionModel = {
        capabilities: ['click', 'hover', 'focus'],
        states: ['default', 'hover', 'focus', 'active', 'disabled'],
        scenarios: [
          { name: 'hover', steps: [{ type: 'hover' }] },
          { name: 'click', steps: [{ type: 'click' }] },
        ],
      };
      return {
        key: buildKey(el, index),
        type: 'button',
        selector,
        selectorStrategy: strategy,
        label: label || undefined,
        interactionModel,
      };
    },
  },

  // mat-checkbox
  {
    name: 'mat-checkbox',
    match: (el) => el.tagName.toLowerCase() === 'mat-checkbox',
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(
        `[InferenceRule:mat-checkbox] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`
      );
      const interactionModel: InteractionModel = {
        capabilities: ['toggle', 'focus'],
        states: ['unchecked', 'checked', 'indeterminate', 'disabled'],
        scenarios: [{ name: 'toggle', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'checkbox',
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // mat-slide-toggle
  {
    name: 'mat-slide-toggle',
    match: (el) => el.tagName.toLowerCase() === 'mat-slide-toggle',
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(
        `[InferenceRule:mat-slide-toggle] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`
      );
      const interactionModel: InteractionModel = {
        capabilities: ['toggle'],
        states: ['off', 'on', 'disabled'],
        scenarios: [{ name: 'toggle', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'toggle',
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },

  // mat-radio-button
  {
    name: 'mat-radio-button',
    match: (el) => el.tagName.toLowerCase() === 'mat-radio-button',
    produce: (el, index) => {
      const { selector, strategy } = buildSelector(el);
      console.log(
        `[InferenceRule:mat-radio-button] key="${buildKey(el, index)}" selector="${selector}" strategy="${strategy}"`
      );
      const interactionModel: InteractionModel = {
        capabilities: ['click', 'focus'],
        states: ['unchecked', 'checked', 'disabled'],
        scenarios: [{ name: 'select', steps: [{ type: 'click' }] }],
      };
      return {
        key: buildKey(el, index),
        type: 'radio',
        selector,
        selectorStrategy: strategy,
        label: el.getAttribute('aria-label') ?? undefined,
        interactionModel,
      };
    },
  },
];
