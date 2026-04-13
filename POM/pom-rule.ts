import type { Capability, ElementModel } from '../engine/dom-analyzer/interaction-model';

export type PomRuleTarget = string | { type?: string; label?: string };

export type PomRule = {
  target: PomRuleTarget;
  action: Capability;
  value?: string;
  when?: (el: ElementModel) => boolean;
  priority?: number;
};

export function matchesTarget(el: ElementModel, target: PomRuleTarget): boolean {
  if (typeof target === 'string') {
    return el.key === target;
  }
  const typeMatch = target.type === undefined || el.type === target.type;
  const labelMatch =
    target.label === undefined ||
    (el.label !== undefined && el.label.toLowerCase().includes(target.label.toLowerCase()));
  return typeMatch && labelMatch;
}
