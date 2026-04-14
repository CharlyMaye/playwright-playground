export type Capability = 'fill' | 'click' | 'hover' | 'focus' | 'open' | 'toggle' | 'select';

export type ScenarioStep = {
  type: Capability;
  value?: string;
};

export type Scenario = {
  name: string;
  steps: ScenarioStep[];
};

export type InteractionModel = {
  capabilities: Capability[];
  states: string[];
  scenarios: Scenario[];
};

export type ElementModel = {
  key: string;
  type: string;
  selector: string;
  selectorStrategy: string;
  label?: string;
  matchedRule: string;
  interactionModel: InteractionModel;
};

/**
 * InferenceRule — engine contract for Phase 1 DOM analysis.
 * match and produce run inside page.evaluate() — must be serializable.
 * name is used for traceability in the produced ElementModel.
 */
export type InferenceRule = {
  name: string;
  match: (el: Element) => boolean;
  produce: (el: Element, index: number) => Partial<ElementModel>;
};

export type InferenceHelpers = {
  buildKey: (el: Element, index: number) => string;
  buildSelector: (el: Element) => { selector: string; strategy: string };
};
