import { Engine, RuleProperties } from 'json-rules-engine';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { CandidateAction, ElementFact, UnitaryAction } from './types';

export abstract class RulesEngine {
  abstract evaluate(facts: ElementFact[]): Promise<CandidateAction[]>;
  abstract loadRules(rules: RuleProperties[]): void;
}

@Injector({ Provide: [ExplorationConfig] })
export class ConcreteRulesEngine extends RulesEngine {
  readonly #engine: Engine;
  readonly #config: ExplorationConfig;

  constructor(protected explorationConfig: ExplorationConfig) {
    super();
    this.#engine = new Engine();
    this.#config = explorationConfig;
    this.#loadDefaultRules();
  }

  loadRules(rules: RuleProperties[]): void {
    for (const rule of rules) {
      this.#engine.addRule(rule);
    }
  }

  async evaluate(facts: ElementFact[]): Promise<CandidateAction[]> {
    const actions: CandidateAction[] = [];

    for (const fact of facts) {
      if (!fact.visible || !fact.enabled) continue;

      const factData = { ...fact } as Record<string, unknown>;
      try {
        const result = await this.#engine.run(factData);
        for (const event of result.events) {
          const action = this.#eventToAction(event, fact);
          if (action) actions.push(action);
        }
      } catch {
        // Rule evaluation failed for this fact — skip silently
      }
    }

    // Sort by priority (descending) and limit
    actions.sort((a, b) => b.priority - a.priority);
    return actions.slice(0, this.#config.maxActionsPerState);
  }

  #eventToAction(event: { type: string; params?: Record<string, unknown> }, fact: ElementFact): CandidateAction | null {
    const priority = (event.params?.priority as number) ?? 5;
    const targetUid = fact.uid;

    switch (event.type) {
      case 'click':
        return { type: 'click', targetUid, priority };
      case 'hover':
        return { type: 'hover', targetUid, priority };
      case 'fill': {
        const inputType = fact.inputType ?? 'text';
        const value = this.#config.fillValues[inputType] ?? this.#config.fillValues['text'] ?? 'test';
        return { type: 'fill', targetUid, value, priority };
      }
      case 'select':
        return { type: 'select', targetUid, option: '', priority };
      case 'focus':
        return { type: 'focus', targetUid, priority };
      case 'clear':
        return { type: 'clear', targetUid, priority };
      case 'sequence': {
        const steps = (event.params?.steps as UnitaryAction[]) ?? [];
        return {
          type: 'sequence',
          steps: steps.map((s) => ({ action: s })),
          priority,
        };
      }
      default:
        return null;
    }
  }

  #loadDefaultRules(): void {
    // Button rules
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'button' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 10 } },
    });

    // Button with aria-expanded=false (opens something) — higher priority
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'button' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
          { fact: 'ariaExpanded', operator: 'equal', value: false },
        ],
      },
      event: { type: 'click', params: { priority: 15 } },
    });

    // Link rules
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'a' },
          { fact: 'visible', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 5 } },
    });

    // Input text/email/password — fill
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'input' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
          {
            fact: 'inputType',
            operator: 'in',
            value: ['text', 'email', 'password', 'search', 'tel', 'url'],
          },
        ],
      },
      event: { type: 'fill', params: { priority: 8 } },
    });

    // Input checkbox/radio — click
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'input' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
          { fact: 'inputType', operator: 'in', value: ['checkbox', 'radio'] },
        ],
      },
      event: { type: 'click', params: { priority: 7 } },
    });

    // Textarea — fill
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'textarea' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
        ],
      },
      event: { type: 'fill', params: { priority: 8 } },
    });

    // Native select
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'select' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
        ],
      },
      event: { type: 'select', params: { priority: 8 } },
    });

    // Role=combobox — sequence
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'role', operator: 'equal', value: 'combobox' },
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 12 } },
    });

    // Role=tab
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'role', operator: 'equal', value: 'tab' },
          { fact: 'visible', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 7 } },
    });

    // Role=menuitem
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'role', operator: 'equal', value: 'menuitem' },
          { fact: 'visible', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 9 } },
    });

    // aria-haspopup — hover (ouvre un sous-menu)
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'visible', operator: 'equal', value: true },
          { fact: 'enabled', operator: 'equal', value: true },
          { fact: 'ariaExpanded', operator: 'equal', value: false },
        ],
      },
      event: { type: 'click', params: { priority: 13 } },
    });

    // Summary / accordion
    this.#engine.addRule({
      conditions: {
        all: [
          { fact: 'tag', operator: 'equal', value: 'summary' },
          { fact: 'visible', operator: 'equal', value: true },
        ],
      },
      event: { type: 'click', params: { priority: 12 } },
    });
  }
}
