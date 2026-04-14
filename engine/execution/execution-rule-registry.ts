import { RuleRegistry } from '../rule-registry';
import type { ExecutionRule } from './execution-model';

const _registry = new RuleRegistry<ExecutionRule>();

export function register(rules: ExecutionRule[]): void {
  _registry.register(rules);
}

export function getExecutionRules(): ExecutionRule[] {
  return _registry.getAll();
}
