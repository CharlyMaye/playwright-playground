import type { RuleProperties } from 'json-rules-engine';

/**
 * Default set of HTML-generic exploration rules.
 *
 * These are loaded automatically by {@link ConcreteRulesEngine} unless the
 * consumer provides a custom `rules` array in the {@link ExplorationConfig}.
 *
 * They cover standard HTML interactive patterns (buttons, links, inputs,
 * selects, textareas, ARIA roles). They are **not** tied to any specific
 * framework or application.
 *
 * To extend: pass `additionalRules` in the config.
 * To replace entirely: pass `rules` in the config.
 */
export const DEFAULT_HTML_RULES: RuleProperties[] = [
  // Button — click
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 10 } },
  },

  // Button with aria-expanded=false (opens something) — higher priority
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
        { fact: 'ariaExpanded', operator: 'equal', value: false },
      ],
    },
    event: { type: 'click', params: { priority: 15 } },
  },

  // Link — click
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'a' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 5 } },
  },

  // Input text/email/password/search/tel/url — fill
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'input' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
        {
          fact: 'inputType',
          operator: 'in',
          value: ['text', 'email', 'password', 'search', 'tel', 'url'],
        },
      ],
    },
    event: { type: 'fill', params: { priority: 8 } },
  },

  // Input checkbox/radio — click
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'input' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
        { fact: 'inputType', operator: 'in', value: ['checkbox', 'radio'] },
      ],
    },
    event: { type: 'click', params: { priority: 7 } },
  },

  // Textarea — fill
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'textarea' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'fill', params: { priority: 8 } },
  },

  // Native select
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'select' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'select', params: { priority: 8 } },
  },

  // Role=combobox — click
  {
    conditions: {
      all: [
        { fact: 'role', operator: 'equal', value: 'combobox' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 12 } },
  },

  // Role=tab — click
  {
    conditions: {
      all: [
        { fact: 'role', operator: 'equal', value: 'tab' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 7 } },
  },

  // Role=menuitem — click
  {
    conditions: {
      all: [
        { fact: 'role', operator: 'equal', value: 'menuitem' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 9 } },
  },

  // Role=option — click (select item in listbox)
  {
    conditions: {
      all: [
        { fact: 'role', operator: 'equal', value: 'option' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 8 } },
  },

  // Role=treeitem — click (select/expand tree node)
  {
    conditions: {
      all: [
        { fact: 'role', operator: 'equal', value: 'treeitem' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 8 } },
  },

  // aria-expanded=false (expandable elements) — click
  {
    conditions: {
      all: [
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
        { fact: 'ariaExpanded', operator: 'equal', value: false },
      ],
    },
    event: { type: 'click', params: { priority: 13 } },
  },

  // Summary / accordion — click
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'summary' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 12 } },
  },
];
