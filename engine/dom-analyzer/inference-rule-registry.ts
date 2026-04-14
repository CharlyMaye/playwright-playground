import { RuleRegistry } from '../rule-registry';
import type { InferenceHelpers, InferenceRule } from './interaction-model';

const _rulesRegistry = new RuleRegistry<InferenceRule>();
let _helpers: InferenceHelpers = {
  buildKey: (_el, i) => `element-${i}`,
  buildSelector: (el) => ({ selector: el.tagName.toLowerCase(), strategy: 'tagName' }),
};

export function register(rules: InferenceRule[], helpers: InferenceHelpers): void {
  _rulesRegistry.register(rules);
  _helpers = helpers;
}

export function getInferenceRules(): InferenceRule[] {
  return _rulesRegistry.getAll();
}

export function getInferenceHelpers(): InferenceHelpers {
  return _helpers;
}
