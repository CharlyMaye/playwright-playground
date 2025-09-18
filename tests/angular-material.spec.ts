import { test as baseTest } from "../engine";
import { AngularMaterialPOM } from "../POM";

const it = baseTest(AngularMaterialPOM);
const { describe } = it;

describe("Angular Material WebSite", () => {
  it(
    "Angular Material WebSite",
    {},
    async ({ instance, expectContext, testContext }) => {
      await instance.goto();
    }
  );
  describe("Autocomplete", () => {
    it("visual", {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteStyle();
    });
    it("filter", {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteFilterBehavior();
    });
    it("keyboard", {}, async ({ instance, expectContext, testContext }) => {
      await instance.testAutocompleteKeyboardBehavior();
    });
  });
  describe("Button", () => {
    it("visual", {}, async ({ instance, expectContext, testContext }) => {
      await instance.testButtonStyle();
    });
  });
});
