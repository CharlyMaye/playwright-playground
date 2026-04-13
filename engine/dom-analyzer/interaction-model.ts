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
  label?: string;
  interactionModel: InteractionModel;
};
