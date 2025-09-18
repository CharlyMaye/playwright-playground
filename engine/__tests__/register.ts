import { register } from '../index';
import { AnotherFakeClass } from './AnotherFakeClass';
import { ConcreteFakeClass, FakeClass } from './FakeClass';
import { ConcreteFakeService, FakeService } from './FakeService';

export function setup() {
  register(FakeClass, ConcreteFakeClass);
  register(FakeService, ConcreteFakeService);
  register(AnotherFakeClass);
}
