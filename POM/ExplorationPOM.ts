import * as fs from 'fs';
import { ExpectContext, TestContext } from '../engine';
import type { CandidateAction, SerializedGraph, Transition, UnitaryAction } from '../explorer/types';
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
    const content = fs.readFileSync(jsonPath, 'utf-8');
    this.#data = JSON.parse(content) as ExplorationOutput;
    this._selectors.rootSelector = (this.#data.config['rootSelector'] as string) ?? 'body';
    return this;
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
    }, 'goto');
  }

  public replayScenario(name: string): this {
    this.#ensureLoaded();
    const scenario = this.#data!.scenarios.find((s) => s.name === name);
    if (!scenario) {
      throw new Error(`Scenario "${name}" not found. Available: ${this.#data!.scenarios.map((s) => s.name).join(', ')}`);
    }
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const label = this.#actionLabel(step, i);
      this._addAction(async () => {
        await this.#executeAction(step);
      }, `${name}--step-${i}--${label}`);
    }
    return this;
  }

  public replayAll(): this {
    this.#ensureLoaded();

    // If there are named scenarios (from non-self-loop transitions), replay them
    if (this.#data!.scenarios.length > 0) {
      for (const scenario of this.#data!.scenarios) {
        this._addAction(async () => {
          await this._page.goto(this.#data!.url, { waitUntil: 'load' });
        }, `${scenario.name}--goto`);
        for (let i = 0; i < scenario.steps.length; i++) {
          const step = scenario.steps[i];
          const label = this.#actionLabel(step, i);
          this._addAction(async () => {
            await this.#executeAction(step);
          }, `${scenario.name}--step-${i}--${label}`);
        }
      }
    }

    // Also replay self-loop transitions (hover, focus, mousedown, click that
    // didn't change DOM state). Each gets its own goto to reset visual state.
    const selfLoops = this.#data!.graph.transitions.filter((t: Transition) => t.selfLoop);
    for (let i = 0; i < selfLoops.length; i++) {
      const t = selfLoops[i];
      const label = this.#actionLabel(t.action, i);
      this._addAction(async () => {
        await this._page.goto(this.#data!.url, { waitUntil: 'load' });
      }, `self-loop-${i}--goto`);
      this._addAction(async () => {
        await this.#executeAction(t.action);
      }, `self-loop-${i}--${label}`);
    }

    return this;
  }

  public clickElement(uid: string): this {
    return this._addAction(
      async () => {
        const locator = this.#resolveByUid(uid);
        await locator.click();
      },
      `click-${this.#sanitizeUid(uid)}`
    );
  }

  public hoverElement(uid: string): this {
    return this._addAction(
      async () => {
        const locator = this.#resolveByUid(uid);
        await locator.hover();
      },
      `hover-${this.#sanitizeUid(uid)}`
    );
  }

  public fillElement(uid: string, value: string): this {
    return this._addAction(
      async () => {
        const locator = this.#resolveByUid(uid);
        await locator.fill(value);
      },
      `fill-${this.#sanitizeUid(uid)}`
    );
  }

  #ensureLoaded(): void {
    if (!this.#data) {
      throw new Error('No exploration data loaded. Call load(jsonPath) first.');
    }
  }

  #sanitizeUid(uid: string): string {
    return uid.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  }

  #actionLabel(action: CandidateAction, index: number): string {
    if (action.type === 'sequence') {
      const types = action.steps.map((s) => s.action.type).join('+');
      return `${index}-sequence-${types}`;
    }
    return `${index}-${action.type}-${this.#sanitizeUid(action.targetUid)}`;
  }

  #resolveByUid(uid: string, cssSelector?: string) {
    this.#ensureLoaded();
    // Priority 1: explicit page-level selector carried by the action
    if (cssSelector) {
      return this._page.locator(cssSelector);
    }
    // Priority 2: find the fact's cssSelector from the graph
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
    const locator = this.#resolveByUid(action.targetUid, action.targetSelector);

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
      case 'mousedown':
        await locator.dispatchEvent('mousedown');
        break;
    }
  }
}
