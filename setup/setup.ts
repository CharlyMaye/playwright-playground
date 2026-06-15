import { register } from '../engine';
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

  isAlreadySetup = true;
}
