import type { Capability, ElementModel } from '../dom-analyzer/interaction-model';

/**
 * ActionTarget — identifies which element(s) an Action applies to.
 * - string: exact key match
 * - object: match by type and/or label (fuzzy)
 */
export type ActionTarget = string | { type?: string; label?: string };

/**
 * Action — a single planned interaction on an element.
 * Phase 2 planning output, Phase 3 execution input.
 */
export type Action = {
  target: ActionTarget;
  action: Capability;
  value?: string;
  when?: (el: ElementModel) => boolean;
  priority?: number;
};

export function matchesElement(el: ElementModel, target: ActionTarget): boolean {
  if (typeof target === 'string') {
    return el.key === target;
  }
  const typeMatch = target.type === undefined || el.type === target.type;
  const labelMatch =
    target.label === undefined ||
    (el.label !== undefined && el.label.toLowerCase().includes(target.label.toLowerCase()));
  return typeMatch && labelMatch;
}
