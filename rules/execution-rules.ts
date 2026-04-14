import type { Action } from '../engine/execution/action';
import type { ExecutionRule } from '../engine/execution/execution-model';

export const EXECUTION_RULES: ExecutionRule[] = [
  // fill — focus first, then fill
  {
    name: 'fill',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'fill');
      console.log(`[ExecutionRule:fill] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (scenario, el) => {
      const fillStep = scenario.steps.find((s) => s.type === 'fill');
      const actions: Action[] = [
        { target: el.key, action: 'focus' },
        { target: el.key, action: 'fill', value: fillStep?.value },
      ];
      console.log(`[ExecutionRule:fill] producing actions=[focus, fill] for el="${el.key}"`);
      return actions;
    },
  },

  // open — select / dropdown
  {
    name: 'open',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'open');
      console.log(`[ExecutionRule:open] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:open] producing actions=[open] for el="${el.key}"`);
      return [{ target: el.key, action: 'open' }];
    },
  },

  // hover
  {
    name: 'hover',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'hover');
      console.log(`[ExecutionRule:hover] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:hover] producing actions=[hover] for el="${el.key}"`);
      return [{ target: el.key, action: 'hover' }];
    },
  },

  // focus only (no fill)
  {
    name: 'focus',
    match: (scenario, el) => {
      const matches =
        scenario.steps.some((s) => s.type === 'focus') &&
        scenario.steps.every((s) => s.type !== 'fill');
      console.log(`[ExecutionRule:focus] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:focus] producing actions=[focus] for el="${el.key}"`);
      return [{ target: el.key, action: 'focus' }];
    },
  },

  // toggle — checkbox, slide-toggle
  {
    name: 'toggle',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'toggle');
      console.log(`[ExecutionRule:toggle] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:toggle] producing actions=[toggle] for el="${el.key}"`);
      return [{ target: el.key, action: 'toggle' }];
    },
  },

  // click
  {
    name: 'click',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'click');
      console.log(`[ExecutionRule:click] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:click] producing actions=[click] for el="${el.key}"`);
      return [{ target: el.key, action: 'click' }];
    },
  },

  // select — option inside open select
  {
    name: 'select',
    match: (scenario, el) => {
      const matches = scenario.steps.some((s) => s.type === 'select');
      console.log(`[ExecutionRule:select] scenario="${scenario.name}" el="${el.key}" matched=${matches}`);
      return matches;
    },
    produce: (_scenario, el) => {
      console.log(`[ExecutionRule:select] producing actions=[select] for el="${el.key}"`);
      return [{ target: el.key, action: 'select' }];
    },
  },
];
