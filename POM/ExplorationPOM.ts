import * as fs from 'fs';
import { ExpectContext, TestContext } from '../engine';
import { resolveTargetLocator } from '../explorer/adapters/playwright/locator-resolver';
import type { CandidateAction, ElementFact, SerializedGraph, Transition, UnitaryAction } from '../explorer/types';
import { BuilderPOM, ConcreteBuilderPOM } from './BuilderPOM';

type Scenario = {
  name: string;
  steps: CandidateAction[];
  targetUids: string[];
};

type ExplorationOutput = {
  url: string;
  target: string;
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
    const scenarioIndex = this.#data!.scenarios.indexOf(scenario);
    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const label = this.#actionLabel(step, i);
      this._addAction(async () => {
        await this.#executeAction(step);
      }, `scenario-${scenarioIndex}--step-${i}--${label}`);
    }
    return this;
  }

  public replayAll(): this {
    this.#ensureLoaded();
    const prefix = this.#data!.target ?? 'unknown';

    // Initial state screenshot
    this._addAction(async () => {
      await this._page.goto(this.#data!.url, { waitUntil: 'load' });
    }, `${prefix}--initial`);

    // Replay named scenarios (non-self-loop transitions)
    if (this.#data!.scenarios.length > 0) {
      for (let scenarioIndex = 0; scenarioIndex < this.#data!.scenarios.length; scenarioIndex++) {
        const scenario = this.#data!.scenarios[scenarioIndex];
        this._addAction(
          async () => {
            await this._page.goto(this.#data!.url, { waitUntil: 'load' });
          },
          undefined,
          true
        );
        for (let i = 0; i < scenario.steps.length; i++) {
          const step = scenario.steps[i];
          const uid = this.#sanitizeUid((step as { targetUid?: string }).targetUid ?? '');
          const isCrossDomain = this.#isCrossDomainNavigation(step);
          this._addAction(async () => {
            if (isCrossDomain && step.type === 'click') {
              // External link: hover to capture visual state without navigating away
              const locator = this.#resolveByUid(
                (step as UnitaryAction).targetUid,
                (step as UnitaryAction & { targetSelector?: string }).targetSelector
              );
              await locator.hover();
            } else {
              await this.#executeAction(step);
            }
          }, `${prefix}--scenario-${scenarioIndex}--${step.type}-${uid}`);
        }
      }
    }

    // Replay self-loop transitions (hover, focus, mousedown, click that
    // didn't change DOM state). Each gets its own goto to reset visual state.
    const selfLoops = this.#data!.graph.transitions.filter((t: Transition) => t.selfLoop);
    for (const t of selfLoops) {
      const uid = this.#sanitizeUid((t.action as { targetUid?: string }).targetUid ?? '');
      this._addAction(
        async () => {
          await this._page.goto(this.#data!.url, { waitUntil: 'load' });
        },
        undefined,
        true
      );
      this._addAction(async () => {
        await this.#executeAction(t.action);
      }, `${prefix}--${t.action.type}-${uid}`);
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

  #resolveByUid(uid: string, nativeSelector?: string) {
    this.#ensureLoaded();
    const root = this._page.locator(this._selectors.rootSelector);
    // Priority 1: explicit selector carried by the action, else the fact's
    // selector from the graph; shared resolver handles uid fallbacks.
    const selector = nativeSelector ?? this.#findFactSelector(uid);
    return resolveTargetLocator(this._page, root, uid, selector);
  }

  #findFactSelector(uid: string): string | undefined {
    for (const state of this.#data!.graph.states) {
      const fact: (ElementFact & { cssSelector?: string }) | undefined = state.facts.find((f) => f.uid === uid);
      // Legacy JSON files (pre nativeSelector rename) carry `cssSelector`.
      const selector = fact?.nativeSelector ?? fact?.cssSelector;
      if (selector) return selector;
    }
    return undefined;
  }

  #isCrossDomainNavigation(action: CandidateAction): boolean {
    if (!this.#data) return false;
    const targetUid = (action as { targetUid?: string }).targetUid;
    const transition = this.#data.graph.transitions.find(
      (t: Transition) =>
        t.to === '__external_navigation__' &&
        (t.action as { targetUid?: string }).targetUid === targetUid
    );
    if (!transition?.navigationUrl) return false;
    try {
      return new URL(this.#data.url).origin !== new URL(transition.navigationUrl).origin;
    } catch {
      return true;
    }
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
