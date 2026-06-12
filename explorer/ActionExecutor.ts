import type { Locator } from '@playwright/test';
import { Injector } from '../engine';
import { TestContext } from '../engine/test.context';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationScope } from './ExplorationScope';
import { ReadinessChecker } from './ReadinessChecker';
import { ActionResult, CandidateAction, ElementFact, SelectAction, SequenceAction, UnitaryAction, WaitCondition } from './types';

export abstract class ActionExecutor {
  abstract execute(action: CandidateAction): Promise<ActionResult>;
}

@Injector({ Provide: [TestContext, ExplorationScope, ExplorationConfig, ReadinessChecker] })
export class ConcreteActionExecutor extends ActionExecutor {
  readonly #page;
  readonly #scope: ExplorationScope;
  readonly #config: ExplorationConfig;
  readonly #readiness: ReadinessChecker;

  constructor(testContext: TestContext, explorationScope: ExplorationScope, explorationConfig: ExplorationConfig, readinessChecker: ReadinessChecker) {
    super();
    this.#page = testContext.page;
    this.#scope = explorationScope;
    this.#config = explorationConfig;
    this.#readiness = readinessChecker;
  }

  async execute(action: CandidateAction): Promise<ActionResult> {
    const start = Date.now();

    try {
      if (action.type === 'sequence') {
        return await this.#executeSequence(action, start);
      } else {
        return await this.#executeUnitary(action, start);
      }
    } catch (error) {
      return this.#result(start, error instanceof Error ? error.message : String(error));
    }
  }

  #result(start: number, error: string | null = null): ActionResult {
    const success = error === null;
    return { success, error, newFacts: [], domChanged: success, duration: Date.now() - start };
  }

  async #executeUnitary(action: UnitaryAction, start: number): Promise<ActionResult> {
    const locator = this.#resolveLocator(action.targetUid, action.targetSelector);
    const timeout = this.#config.stabilizationTimeout;

    switch (action.type) {
      case 'click':
        await locator.click({ timeout });
        break;
      case 'hover':
        await locator.hover({ timeout });
        break;
      case 'fill':
        await locator.fill(action.value, { timeout });
        break;
      case 'select':
        await this.#selectOption(locator, action, timeout);
        break;
      case 'focus':
        await locator.focus({ timeout });
        break;
      case 'clear':
        await locator.clear({ timeout });
        break;
      case 'mousedown':
        await locator.dispatchEvent('mousedown', { timeout });
        break;
    }

    await this.#readiness.waitForReady();
    await this.#page.waitForTimeout(this.#config.stabilizationTimeout);

    return this.#result(start);
  }

  /** Selects the requested option label, or falls back to the first non-empty one. */
  async #selectOption(locator: Locator, action: SelectAction, timeout: number): Promise<void> {
    if (action.option) {
      await locator.selectOption({ label: action.option }, { timeout });
      return;
    }
    const options = await locator.locator('option').allTextContents();
    const label = options.find((o) => o.trim()) ?? '';
    if (label) await locator.selectOption({ label }, { timeout });
  }

  async #executeSequence(action: SequenceAction, start: number): Promise<ActionResult> {
    const stepTimeout = this.#config.stabilizationTimeout;

    for (const step of action.steps) {
      const stepResult = await this.#executeUnitary(step.action, start);
      if (!stepResult.success) {
        return this.#result(start, `Sequence step failed: ${stepResult.error}`);
      }

      if (step.waitAfter) {
        await this.#evaluateWaitCondition(step.waitAfter, stepTimeout);
      }
    }

    return this.#result(start);
  }

  async #evaluateWaitCondition(condition: WaitCondition, timeout: number): Promise<void> {
    switch (condition.type) {
      case 'selector':
        await this.#page.locator(condition.selector).waitFor({ state: condition.state, timeout });
        break;
      case 'stable':
        await this.#page.waitForTimeout(condition.timeout);
        break;
      case 'function':
        await this.#page.waitForFunction(condition.expression, undefined, { timeout });
        break;
      case 'delay':
        await this.#page.waitForTimeout(condition.ms);
        break;
    }
  }

  #resolveLocator(uid: string, cssSelector?: string) {
    const page = this.#page;
    const root = this.#scope.root;

    // Priority 1: page-level CSS selector captured by DOMExtractor (most reliable)
    if (cssSelector) {
      return page.locator(cssSelector);
    }

    // Priority 2: testid:xxx
    if (uid.startsWith('testid:')) {
      const testId = uid.slice('testid:'.length);
      return root.getByTestId(testId);
    }
    // #id
    if (uid.startsWith('#')) {
      return page.locator(uid);
    }
    // role:"name"
    const roleMatch = uid.match(/^(\w+):"(.+)"$/);
    if (roleMatch) {
      return root.getByRole(roleMatch[1] as Parameters<typeof root.getByRole>[0], { name: roleMatch[2] });
    }
    // role[index] or tag[index]
    const indexMatch = uid.match(/^(\w+)\[(\d+)\]$/);
    if (indexMatch) {
      return root.locator(indexMatch[1]).nth(parseInt(indexMatch[2], 10));
    }
    // Fallback — treat uid as selector
    return root.locator(uid);
  }
}

/** Utility: compute simple diff of appeared/disappeared/modified elements */
export function computeDomChanges(before: ElementFact[], after: ElementFact[]): { appeared: string[]; disappeared: string[]; modified: string[] } {
  const beforeUids = new Set(before.map((f) => f.uid));
  const afterUids = new Set(after.map((f) => f.uid));
  const afterMap = new Map(after.map((f) => [f.uid, f]));
  const beforeMap = new Map(before.map((f) => [f.uid, f]));

  const appeared = [...afterUids].filter((uid) => !beforeUids.has(uid));
  const disappeared = [...beforeUids].filter((uid) => !afterUids.has(uid));
  const modified = [...afterUids]
    .filter((uid) => beforeUids.has(uid))
    .filter((uid) => {
      const b = beforeMap.get(uid)!;
      const a = afterMap.get(uid)!;
      return b.visible !== a.visible || b.enabled !== a.enabled || b.ariaExpanded !== a.ariaExpanded;
    });

  return { appeared, disappeared, modified };
}
