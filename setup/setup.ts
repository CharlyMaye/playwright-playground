import { register } from '../engine';
import { ConcreteDomAnalyzer, DomAnalyzer } from '../engine/dom-analyzer';
import { AngularMaterialPOM, ConcreteVisualRegressionPOM, VisualRegressionPOM } from '../POM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  register(AngularMaterialPOM);
  register(VisualRegressionPOM, ConcreteVisualRegressionPOM);
  register(DomAnalyzer, ConcreteDomAnalyzer);
  isAlreadySetup = true;
}
