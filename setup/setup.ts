import { register } from '../engine';
import { AngularMaterialAutocompletePOM, AngularMaterialPOM, AutocompletePOM } from '../POM';
import { AngularMaterialButtonPOM, ButtonPOM } from '../POM/AngularMaterialButtonPOM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  register(AngularMaterialPOM);
  register(AutocompletePOM, AngularMaterialAutocompletePOM);
  register(ButtonPOM, AngularMaterialButtonPOM);
  isAlreadySetup = true;
}
