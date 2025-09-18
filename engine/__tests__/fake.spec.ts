import { test } from "@playwright/test";
import { resolve } from "../index";
import { FakeClass } from "./FakeClass";

test("fake test", {}, async () => {
  const instance = resolve(FakeClass);
});
