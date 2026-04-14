import { INFERENCE_RULES } from '../../rules';
import { ConcreteDomAnalyzer, DomAnalyzer, registerInferenceRules } from '../dom-analyzer';
import { buildKey, buildSelector } from '../dom-analyzer/helpers';
import { register } from '../index';
import { AnotherFakeClass } from './AnotherFakeClass';
import { ConcreteFakeClass, FakeClass } from './FakeClass';
import { ConcreteFakeService, FakeService } from './FakeService';

export function setup() {
  registerInferenceRules(INFERENCE_RULES, { buildKey, buildSelector });
  register(FakeClass, ConcreteFakeClass);
  register(FakeService, ConcreteFakeService);
  register(AnotherFakeClass);
  register(DomAnalyzer, ConcreteDomAnalyzer);
}
