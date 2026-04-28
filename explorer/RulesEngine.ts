import { Engine, RuleProperties } from 'json-rules-engine';
import { Injector } from '../engine';
import { DEFAULT_HTML_RULES } from './default-rules';
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

    // Load rules from config — custom rules replace defaults entirely.
    const baseRules = (this.#config.rules as RuleProperties[] | undefined) ?? DEFAULT_HTML_RULES;
    this.loadRules(baseRules);

    const extra = this.#config.additionalRules as RuleProperties[] | undefined;
    if (extra) {
      this.loadRules(extra);
    }
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
    const targetSelector = fact.cssSelector;

    switch (event.type) {
      case 'click':
        return { type: 'click', targetUid, targetSelector, priority };
      case 'hover':
        return { type: 'hover', targetUid, targetSelector, priority };
      case 'fill': {
        const inputType = fact.inputType ?? 'text';
        const value = this.#config.fillValues[inputType] ?? this.#config.fillValues['text'] ?? 'test';
        return { type: 'fill', targetUid, targetSelector, value, priority };
      }
      case 'select':
        return { type: 'select', targetUid, targetSelector, option: '', priority };
      case 'focus':
        return { type: 'focus', targetUid, targetSelector, priority };
      case 'clear':
        return { type: 'clear', targetUid, targetSelector, priority };
      case 'mousedown':
        return { type: 'mousedown', targetUid, targetSelector, priority };
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
}
