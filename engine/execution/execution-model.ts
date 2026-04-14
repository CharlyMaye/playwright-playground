import type { ElementModel, Scenario } from '../dom-analyzer/interaction-model';
import type { Action } from './action';

/**
 * ExecutionRule — engine contract for Phase 2 (planning).
 * Reads a Scenario + ElementModel, produces Action[] to execute.
 *
 * Rules are evaluated in order — first match wins (same pattern as InferenceRule).
 * name is used for traceability in logs.
 */
export type ExecutionRule = {
  name: string;
  match: (scenario: Scenario, el: ElementModel) => boolean;
  produce: (scenario: Scenario, el: ElementModel) => Action[];
};
