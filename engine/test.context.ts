import { APIRequestContext, Browser, Page } from "@playwright/test";

export abstract class TestContext {
  abstract get page(): Page;
  abstract get request(): APIRequestContext;
  abstract get browser(): Browser;
  abstract get browserName(): string;
}
export class ConcreteTestContext extends TestContext {
  #page: Page;
  #request: APIRequestContext;
  #browser: Browser;
  #browserName: string;

  get page() {
    return this.#page;
  }
  set page(value: Page) {
    this.#page = value;
  }

  get request() {
    return this.#request;
  }
  set request(value: APIRequestContext) {
    this.#request = value;
  }

  get browser() {
    return this.#browser;
  }
  set browser(value: Browser) {
    this.#browser = value;
  }

  get browserName() {
    return this.#browserName;
  }
  set browserName(value: string) {
    this.#browserName = value;
  }
}
