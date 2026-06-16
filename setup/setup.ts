import { register } from '../engine';
import { setup as registerEngineTestDoubles } from '../engine/__tests__/register';
import { registerExplorerDependencies } from '../explorer';
import { AngularMaterialPOM } from '../POM';
import { ConcreteExplorationPOM, ExplorationPOM } from '../POM/ExplorationPOM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  registerExplorerDependencies();
  register(AngularMaterialPOM);
  register(ExplorationPOM, ConcreteExplorationPOM);
  // Engine self-tests (fake.spec, test-engine.spec, hooks-demo…) resolve their
  // FakeClass/FakeService doubles through the DI container; register them here
  // so the tokens exist in every worker (INJECTOR is a per-process singleton).
  registerEngineTestDoubles();

  isAlreadySetup = true;
}
