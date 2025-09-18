import { register } from "../engine";
import {
  AngularMaterialAutocompletePOM,
  AngularMaterialPOM,
  AutocompletePOM,
} from "../POM";

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  register(AngularMaterialPOM);
  register(AutocompletePOM, AngularMaterialAutocompletePOM);
  isAlreadySetup = true;
}
