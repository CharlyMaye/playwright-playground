import type { RuleProperties } from 'json-rules-engine';

/**
 * Additional rules that trigger hover, focus, and mousedown actions on
 * interactive elements. These capture CSS pseudo-states (:hover, :focus,
 * :active) for visual regression screenshots.
 *
 * Not in `default-rules.ts` because they serve visual testing, not
 * functional exploration.
 */
export const VISUAL_STATE_RULES: RuleProperties[] = [
  // hover on buttons
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'hover', params: { priority: 9 } },
  },
  // focus on buttons
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'focus', params: { priority: 8 } },
  },
  // mousedown on buttons (:active)
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'mousedown', params: { priority: 7 } },
  },
  // hover on links
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'a' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'hover', params: { priority: 4 } },
  },
  // focus on links
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'a' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'focus', params: { priority: 3 } },
  },
  // mousedown on links (:active)
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'a' },
        { fact: 'visible', operator: 'equal', value: true },
      ],
    },
    event: { type: 'mousedown', params: { priority: 2 } },
  },
];
