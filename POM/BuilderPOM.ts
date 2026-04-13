import { Page } from '@playwright/test';
import { ExpectContext, TestContext } from '../engine';
import type { ElementModel } from '../engine/dom-analyzer/interaction-model';
import { matchesTarget, PomRule } from './pom-rule';

/**
 * BuilderPOM — public contract.
 */
export abstract class BuilderPOM<TSelector = Record<string, string>> {
  public abstract enableScreenshot(): this;
  public abstract disableScreenshot(): this;
  public abstract updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this;
  public abstract loadModel(elements: ElementModel[]): this;
  public abstract addRule(rule: PomRule): this;
  public abstract setScope(selector: string): this;
  public abstract buildRules(): this;
  public abstract execute(): Promise<void>;
}

/**
 * ConcreteBuilderPOM — extends BuilderPOM.
 * Owns the manual action queue, screenshot toggle, and execute().
 * loadModel / addRule / setScope / buildRules are left to RuleEnginePOM.
 */
export abstract class ConcreteBuilderPOM<TSelector = Record<string, string>> extends BuilderPOM<TSelector> {
  protected _page: Page;
  protected abstract _selectors: TSelector;

  #disableScreenshot = true;
  #actionsToExecute: (() => Promise<void>)[] = [];

  constructor(
    protected _testContext: TestContext,
    protected _expectContext: ExpectContext
  ) {
    super();
    this._page = this._testContext.page;
  }

  protected _addAction(action: () => Promise<void>): this {
    this.#actionsToExecute.push(action);
    return this;
  }

  public enableScreenshot(): this {
    return this._addAction(() => {
      this.#disableScreenshot = false;
      return Promise.resolve();
    });
  }

  public disableScreenshot(): this {
    return this._addAction(() => {
      this.#disableScreenshot = true;
      return Promise.resolve();
    });
  }

  public updateSelector<K extends keyof TSelector>(key: K, value: TSelector[K]): this {
    return this._addAction(() => {
      this._selectors[key] = value;
      return Promise.resolve();
    });
  }

  public async execute(): Promise<void> {
    // Always end with screenshot disabled
    this._addAction(() => {
      this.#disableScreenshot = true;
      return Promise.resolve();
    });

    for (const action of this.#actionsToExecute) {
      await action();
      if (!this.#disableScreenshot) {
        await this._expectContext.expectToHaveScreenshot();
      }
    }

    this.#actionsToExecute.length = 0;
  }
}

/**
 * RuleEnginePOM — extends ConcreteBuilderPOM.
 * Adds loadModel(), addRule(), setScope(), buildRules().
 *
 * buildRules() resolves all rules against the model and enqueues each action
 * via _addAction() with automatic screenshot capture (visual regression).
 * Scope can be set via setScope() to limit both DOM analysis and Playwright locators.
 */
export abstract class RuleEnginePOM<TSelector = Record<string, string>> extends ConcreteBuilderPOM<TSelector> {
  #model: ElementModel[] = [];
  #rules: PomRule[] = [];
  #scope: string | undefined;

  public loadModel(elements: ElementModel[]): this {
    this.#model = elements;
    return this;
  }

  public addRule(rule: PomRule): this {
    this.#rules.push(rule);
    return this;
  }

  public setScope(selector: string): this {
    this.#scope = selector;
    return this;
  }

  /**
   * Resolves all rules against the model and enqueues them into the action queue.
   * Each rule action is automatically wrapped with enableScreenshot/disableScreenshot
   * so every interaction produces a screenshot for visual regression.
   * Call this before execute().
   */
  public buildRules(): this {
    if (this.#model.length === 0 || this.#rules.length === 0) return this;

    const sorted = [...this.#rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const seen = new Set<string>();

    for (const rule of sorted) {
      for (const el of this.#model) {
        if (!matchesTarget(el, rule.target)) continue;
        if (rule.when && !rule.when(el)) continue;

        const dedupeKey = `${el.key}::${rule.action}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Scope the locator to the container when a scope is set
        const locator = this.#scope
          ? this._page.locator(this.#scope).locator(el.selector)
          : this._page.locator(el.selector);

        const { action, value } = rule;

        // Wrap with enable/disable so execute() auto-screenshots after this action
        this.enableScreenshot();
        this._addAction(async () => {
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
        this.disableScreenshot();
      }
    }

    this.#rules.length = 0;
    this.#model.length = 0;
    this.#scope = undefined;
    return this;
  }
}
