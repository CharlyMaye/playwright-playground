import { register, registerExecutionRules, registerInferenceRules } from '../engine';
import { ConcreteDomAnalyzer, DomAnalyzer } from '../engine/dom-analyzer';
import { buildKey, buildSelector } from '../engine/dom-analyzer/helpers';
import { AngularMaterialPOM, ConcreteVisualRegressionPOM, VisualRegressionPOM } from '../POM';
import { EXECUTION_RULES, INFERENCE_RULES } from '../rules';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  registerInferenceRules(INFERENCE_RULES, { buildKey, buildSelector });
  registerExecutionRules(EXECUTION_RULES);
  register(AngularMaterialPOM);
  register(VisualRegressionPOM, ConcreteVisualRegressionPOM);
  register(DomAnalyzer, ConcreteDomAnalyzer);
  isAlreadySetup = true;
}
