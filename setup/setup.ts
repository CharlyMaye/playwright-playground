import { register } from '../engine';
import { AngularMaterialPOM } from '../POM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  register(AngularMaterialPOM);
  isAlreadySetup = true;
}
