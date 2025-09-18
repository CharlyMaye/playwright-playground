import { TestContext } from '../index';
import { AnotherFakeClass } from './AnotherFakeClass';

export abstract class FakeService {}
export class ConcreteFakeService extends FakeService {
  constructor(
    protected anotherFakeClass: AnotherFakeClass,
    protected testContext: TestContext
  ) {
    super();
  }
}

// register(FakeService, ConcreteFakeService);
