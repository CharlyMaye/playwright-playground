import { APIRequestContext, Browser, Page } from '@playwright/test';

export abstract class TestContext {
  abstract get page(): Page;
  abstract get request(): APIRequestContext;
  abstract get browser(): Browser;
  abstract get browserName(): string;
}
export class ConcreteTestContext extends TestContext {
  #page!: Page;
  #request!: APIRequestContext;
  #browser!: Browser;
  #browserName!: string;

  get page() {
    if (!this.#page) {
      throw new Error('Page is not initialized yet');
    }
    return this.#page;
  }
  set page(value: Page) {
    this.#page = value;
  }

  get request() {
    if (!this.#request) {
      throw new Error('Request context is not initialized yet');
    }
    return this.#request;
  }
  set request(value: APIRequestContext) {
    this.#request = value;
  }

  get browser() {
    if (!this.#browser) {
      throw new Error('Browser is not initialized yet');
    }
    return this.#browser;
  }
  set browser(value: Browser) {
    this.#browser = value;
  }

  get browserName() {
    if (!this.#browserName) {
      throw new Error('Browser name is not initialized yet');
    }
    return this.#browserName;
  }
  set browserName(value: string) {
    this.#browserName = value;
  }
}
