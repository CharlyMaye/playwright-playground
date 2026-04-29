import { Page } from '@playwright/test';
import { ExpectContext, TestContext } from '../engine';
import type { ScreenshotOptions } from '../engine/expect-service';

export type ClipProvider = () => Promise<ScreenshotOptions | undefined>;

export abstract class BuilderPOM<TSelector = Record<string, string>> {
  public abstract enableScreenshot(): this;
  public abstract disableScreenshot(): this;
  public abstract setClipProvider(provider: ClipProvider): this;

  public abstract updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this;
  public abstract execute(): Promise<void>;
}

export abstract class ConcreteBuilderPOM<TSelector = Record<string, string>> implements BuilderPOM<TSelector> {
  protected _page: Page;
  protected abstract _selectors: TSelector;

  #disableScreenshot = true;
  #clipProvider: ClipProvider | null = null;

  constructor(
    protected _testContext: TestContext,
    protected _expectContext: ExpectContext
  ) {
    this._page = this._testContext.page;
  }

  #actionsToExecute: { action: () => Promise<void>; name?: string; silent?: boolean }[] = [];
  protected _addAction(action: () => Promise<void>, name?: string, silent?: boolean) {
    this.#actionsToExecute.push({ action, name, silent });
    return this;
  }

  public enableScreenshot(): this {
    this.#actionsToExecute.push({
      action: () => {
        this.#disableScreenshot = false;
        return Promise.resolve();
      },
      silent: true,
    });
    return this;
  }

  public disableScreenshot(): this {
    this.#actionsToExecute.push({
      action: () => {
        this.#disableScreenshot = true;
        return Promise.resolve();
      },
      silent: true,
    });
    return this;
  }

  public setClipProvider(provider: ClipProvider): this {
    this.#actionsToExecute.push({
      action: () => {
        this.#clipProvider = provider;
        return Promise.resolve();
      },
      silent: true,
    });
    return this;
  }

  public updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this {
    this.#actionsToExecute.push({
      action: () => {
        this._selectors[key] = value;
        return Promise.resolve();
      },
      silent: true,
    });
    return this;
  }

  public async execute(): Promise<void> {
    // On ajoute une action pour désactiver les screenshots à la fin
    this.disableScreenshot();
    for (const { action, name, silent } of this.#actionsToExecute) {
      await action();
      if (!this.#disableScreenshot && !silent) {
        const clipOptions = this.#clipProvider ? await this.#clipProvider() : undefined;
        await this._expectContext.expectToHaveScreenshot(name, clipOptions);
      }
    }
    this._cleanActions();
  }

  protected _cleanActions(): void {
    this.#actionsToExecute.length = 0;
  }
}
