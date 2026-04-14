import * as fs from 'fs';
import { ExpectContext, TestContext } from '../engine';
import type { CandidateAction, SerializedGraph, UnitaryAction } from '../explorer/types';
import { BuilderPOM, ConcreteBuilderPOM } from './BuilderPOM';

type Scenario = {
  name: string;
  steps: CandidateAction[];
  selectors: string[];
};

type ExplorationOutput = {
  url: string;
  scope: string;
  config: Record<string, unknown>;
  graph: SerializedGraph;
  scenarios: Scenario[];
  generatedAt: string;
};

type ExplorationSelectors = {
  rootSelector: string;
};

export abstract class ExplorationPOM extends BuilderPOM<ExplorationSelectors> {
  abstract load(jsonPath: string): this;
  abstract goto(): this;
  abstract replayScenario(name: string): this;
  abstract replayAll(): this;
  abstract clickElement(uid: string): this;
  abstract hoverElement(uid: string): this;
  abstract fillElement(uid: string, value: string): this;
}

export class ConcreteExplorationPOM extends ConcreteBuilderPOM<ExplorationSelectors> implements ExplorationPOM {
  protected _selectors: ExplorationSelectors = {
    rootSelector: 'body',
  };

  #data: ExplorationOutput | null = null;

  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  public load(jsonPath: string): this {
    return this._addAction(() => {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      this.#data = JSON.parse(content) as ExplorationOutput;
      this._selectors.rootSelector = (this.#data.config['rootSelector'] as string) ?? 'body';
      return Promise.resolve();
    });
  }

  public goto(): this {
    return this._addAction(async () => {
      this.#ensureLoaded();
      await this._page.goto(this.#data!.url, { waitUntil: 'load' });

      try {
        await this._page.locator('button', { hasText: 'Okay, got it' }).click({ timeout: 3_000 });
      } catch {
        // No cookie banner to dismiss
      }
    });
  }

  public replayScenario(name: string): this {
    return this._addAction(async () => {
      this.#ensureLoaded();
      const scenario = this.#data!.scenarios.find((s) => s.name === name);
      if (!scenario) {
        throw new Error(
          `Scenario "${name}" not found. Available: ${this.#data!.scenarios.map((s) => s.name).join(', ')}`
        );
      }
      for (const step of scenario.steps) {
        await this.#executeAction(step);
      }
    });
  }

  public replayAll(): this {
    return this._addAction(async () => {
      this.#ensureLoaded();
      for (const scenario of this.#data!.scenarios) {
        for (const step of scenario.steps) {
          await this.#executeAction(step);
        }
        // Navigate back for the next scenario
        await this._page.goto(this.#data!.url, { waitUntil: 'load' });
      }
    });
  }

  public clickElement(uid: string): this {
    return this._addAction(async () => {
      const locator = this.#resolveByUid(uid);
      await locator.click();
    });
  }

  public hoverElement(uid: string): this {
    return this._addAction(async () => {
      const locator = this.#resolveByUid(uid);
      await locator.hover();
    });
  }

  public fillElement(uid: string, value: string): this {
    return this._addAction(async () => {
      const locator = this.#resolveByUid(uid);
      await locator.fill(value);
    });
  }

  #ensureLoaded(): void {
    if (!this.#data) {
      throw new Error('No exploration data loaded. Call load(jsonPath) first.');
    }
  }

  #resolveByUid(uid: string) {
    this.#ensureLoaded();
    // Priority: find the fact's cssSelector from the graph
    for (const state of this.#data!.graph.states) {
      const fact = state.facts.find((f) => f.uid === uid);
      if (fact?.cssSelector) {
        return this._page.locator(fact.cssSelector);
      }
    }
    // Fallback: resolve uid directly (same logic as ActionExecutor)
    return this.#resolveUidFallback(uid);
  }

  #resolveUidFallback(uid: string) {
    const root = this._page.locator(this._selectors.rootSelector);

    // testid:xxx
    if (uid.startsWith('testid:')) {
      return root.getByTestId(uid.slice('testid:'.length));
    }
    // #id
    if (uid.startsWith('#')) {
      return this._page.locator(uid);
    }
    // role:"name"
    const roleMatch = uid.match(/^(\w+):"(.+)"$/);
    if (roleMatch) {
      return root.getByRole(roleMatch[1] as Parameters<typeof root.getByRole>[0], { name: roleMatch[2] });
    }
    // tag[index]
    const indexMatch = uid.match(/^(\w+)\[(\d+)\]$/);
    if (indexMatch) {
      return root.locator(indexMatch[1]).nth(parseInt(indexMatch[2], 10));
    }
    // Fallback — treat uid as selector
    return root.locator(uid);
  }

  async #executeAction(action: CandidateAction): Promise<void> {
    if (action.type === 'sequence') {
      for (const step of action.steps) {
        await this.#executeUnitary(step.action);
      }
    } else {
      await this.#executeUnitary(action);
    }
  }

  async #executeUnitary(action: UnitaryAction): Promise<void> {
    const locator = this.#resolveByUid(action.targetUid);

    switch (action.type) {
      case 'click':
        await locator.click();
        break;
      case 'hover':
        await locator.hover();
        break;
      case 'fill':
        await locator.fill(action.value);
        break;
      case 'select':
        await locator.selectOption(action.option);
        break;
      case 'focus':
        await locator.focus();
        break;
      case 'clear':
        await locator.clear();
        break;
    }
  }
}
