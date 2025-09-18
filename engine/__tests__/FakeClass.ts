import { Injector } from "../index";
import { FakeService } from "./FakeService";

export abstract class FakeClass {}

@Injector({
  Provide: [FakeService],
})
export class ConcreteFakeClass extends FakeClass {
  constructor(protected service: FakeService) {
    super();
  }
}

// register(FakeClass, ConcreteFakeClass);
