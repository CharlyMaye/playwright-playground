import { Page } from '@playwright/test';
import { ExpectContext, TestContext } from '../engine';
import type { ElementModel } from '../engine/dom-analyzer/interaction-model';
import { matchesTarget, PomRule } from './pom-rule';

export abstract class BuilderPOM<TSelector = Record<string, string>> {
  public abstract enableScreenshot(): this;
  public abstract disableScreenshot(): this;

  public abstract updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this;
  public abstract loadModel(elements: ElementModel[]): this;
  public abstract addRule(rule: PomRule): this;
  public abstract execute(): Promise<void>;
}

export abstract class ConcreteBuilderPOM<TSelector = Record<string, string>> implements BuilderPOM<TSelector> {
  protected _page: Page;
  protected abstract _selectors: TSelector;

  #disableScreenshot = true;
  #model: ElementModel[] = [];
  #rules: PomRule[] = [];

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

  public loadModel(elements: ElementModel[]): this {
    this.#model = elements;
    return this;
  }

  public addRule(rule: PomRule): this {
    this.#rules.push(rule);
    return this;
  }

  #resolveRuleActions(): (() => Promise<void>)[] {
    if (this.#model.length === 0 || this.#rules.length === 0) return [];

    const sorted = [...this.#rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const seen = new Set<string>();
    const actions: (() => Promise<void>)[] = [];

    for (const rule of sorted) {
      for (const el of this.#model) {
        if (!matchesTarget(el, rule.target)) continue;
        if (rule.when && !rule.when(el)) continue;

        const dedupeKey = `${el.key}::${rule.action}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const locator = this._page.locator(el.selector);
        const { action, value } = rule;

        actions.push(async () => {
          switch (action) {
            case 'fill':
              await locator.fill(value ?? '');
              break;
            case 'hover':
              await locator.hover();
              break;
            case 'focus':
              await locator.focus();
              break;
            case 'click':
            case 'open':
            case 'toggle':
            case 'select':
              await locator.click();
              break;
          }
        });
      }
    }

    return actions;
  }

  public async execute(): Promise<void> {
    const ruleActions = this.#resolveRuleActions();

    // Rule-based actions run first, then manually queued actions
    const allActions = [...ruleActions, ...this.#actionsToExecute];

    // Always end with screenshot disabled
    allActions.push(() => {
      this.#disableScreenshot = true;
      return Promise.resolve();
    });

    for (const action of allActions) {
      await action();
      if (!this.#disableScreenshot) {
        await this._expectContext.expectToHaveScreenshot();
      }
    }
    this._cleanActions();
  }

  protected _cleanActions(): void {
    this.#actionsToExecute.length = 0;
    this.#rules.length = 0;
    this.#model.length = 0;
  }
}
