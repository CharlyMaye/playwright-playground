import { Page } from '@playwright/test';
import { ExpectContext, TestContext } from '../engine';

export abstract class BuilderPOM<TSelector = Record<string, string>> {
  public abstract enableScreenshot(): this;
  public abstract disableScreenshot(): this;

  public abstract updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this;
  public abstract execute(): Promise<void>;
}

export abstract class ConcreteBuilderPOM<TSelector = Record<string, string>> implements BuilderPOM<TSelector> {
  protected _page: Page;
  protected abstract _selectors: TSelector;

  #disableScreenshot = true;

  constructor(
    protected _testContext: TestContext,
    protected _expectContext: ExpectContext
  ) {
    this._page = this._testContext.page;
  }

  #actionsToExecute: (() => Promise<void>)[] = [];
  protected _addAction(action: () => Promise<void>) {
    this.#actionsToExecute.push(action);
    return this;
  }

  public enableScreenshot(): this {
    this._addAction(() => {
      this.#disableScreenshot = false;
      return Promise.resolve();
    });
    return this;
  }

  public disableScreenshot(): this {
    this._addAction(() => {
      this.#disableScreenshot = true;
      return Promise.resolve();
    });
    return this;
  }

  public updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this {
    return this._addAction(() => {
      this._selectors[key] = value;
      return Promise.resolve();
    });
  }

  public async execute(): Promise<void> {
    // On ajoute une action pour désactiver les screenshots à la fin
    this.disableScreenshot();
    for (const action of this.#actionsToExecute) {
      await action();
      if (!this.#disableScreenshot) {
        await this._expectContext.expectToHaveScreenshot();
      }
    }
    this._cleanActions();
  }

  protected _cleanActions(): void {
    this.#actionsToExecute.length = 0;
  }
}
