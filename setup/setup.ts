import { register } from '../engine';
import { registerExplorerDependencies } from '../explorer';
import { AngularMaterialPOM } from '../POM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  registerExplorerDependencies();
  register(AngularMaterialPOM);

  isAlreadySetup = true;
}
