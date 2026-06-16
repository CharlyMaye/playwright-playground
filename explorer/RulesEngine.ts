import { Engine, RuleProperties } from 'json-rules-engine';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { CandidateAction, ElementFact, SelectAction, UnitaryAction } from './types';

/**
 * Source of the default rules loaded when {@link ExplorationConfig.rules} is absent.
 *
 * Each adapter registers its own defaults (HTML rules for the web, UIA rules
 * for WPF…) by implementing this port, keeping the core driver-agnostic.
 */
export abstract class DefaultRules {
  abstract get rules(): RuleProperties[];
}

/**
 * Rule-evaluation engine that maps a set of {@link ElementFact}s to a list
 * of candidate actions ({@link CandidateAction}).
 *
 * Each rule is expressed in the JSON Rules Engine format and evaluates the
 * properties of a fact to emit an action event. The active rule set is
 * configured by {@link ExplorationConfig.rules} and
 * {@link ExplorationConfig.additionalRules}.
 */
export abstract class RulesEngine {
  /** Evaluates the facts and returns candidate actions sorted by descending priority. */
  abstract evaluate(facts: ElementFact[]): Promise<CandidateAction[]>;
  /** Loads a list of JSON Rules Engine rules into the engine. */
  abstract loadRules(rules: RuleProperties[]): void;
}

/**
 * Concrete implementation of {@link RulesEngine} backed by `json-rules-engine`.
 *
 * At construction time, loads the base rules (custom or defaults) followed by
 * any additional rules. Evaluation iterates over each visible and enabled fact,
 * collects emitted events and converts them into {@link CandidateAction}s.
 */
@Injector({ Provide: [ExplorationConfig, DefaultRules] })
export class ConcreteRulesEngine extends RulesEngine {
  readonly #engine: Engine;
  readonly #config: ExplorationConfig;

  constructor(explorationConfig: ExplorationConfig, defaultRules: DefaultRules) {
    super();
    this.#engine = new Engine();
    this.#config = explorationConfig;

    // Load rules from config — custom rules replace defaults entirely.
    const baseRules = (this.#config.rules as RuleProperties[] | undefined) ?? defaultRules.rules;
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
          actions.push(...this.#eventToActions(event, fact));
        }
      } catch {
        // Rule evaluation failed for this fact — skip silently
      }
    }

    // Sort by priority (descending) and limit
    actions.sort((a, b) => b.priority - a.priority);
    return actions.slice(0, this.#config.maxActionsPerState);
  }

  /**
   * Converts a rule event into the candidate action(s) it implies for `fact`.
   *
   * Returns a list because a single `select` event can expand into several
   * actions under {@link ExplorationConfig.selectStrategy} `'all'` (one per
   * option). Every other event type yields exactly one action (or none).
   */
  #eventToActions(event: { type: string; params?: Record<string, unknown> }, fact: ElementFact): CandidateAction[] {
    const priority = (event.params?.priority as number) ?? 5;
    const targetUid = fact.uid;
    const targetSelector = fact.nativeSelector;

    switch (event.type) {
      case 'click':
        return [{ type: 'click', targetUid, targetSelector, priority }];
      case 'hover':
        return [{ type: 'hover', targetUid, targetSelector, priority }];
      case 'fill': {
        const inputType = fact.inputType ?? 'text';
        const value = this.#config.fillValues[inputType] ?? this.#config.fillValues['text'] ?? 'test';
        return [{ type: 'fill', targetUid, targetSelector, value, priority }];
      }
      case 'select':
        return this.#selectActions(fact, targetUid, targetSelector, priority);
      case 'focus':
        return [{ type: 'focus', targetUid, targetSelector, priority }];
      case 'clear':
        return [{ type: 'clear', targetUid, targetSelector, priority }];
      case 'mousedown':
        return [{ type: 'mousedown', targetUid, targetSelector, priority }];
      case 'sequence': {
        const steps = (event.params?.steps as UnitaryAction[]) ?? [];
        return [
          {
            type: 'sequence',
            steps: steps.map((s) => ({ action: s })),
            priority,
          },
        ];
      }
      default:
        return [];
    }
  }

  /**
   * Builds the `select` candidate action(s) for `fact` per
   * {@link ExplorationConfig.selectStrategy}:
   *
   * - `'first'` *(default)* — one action with an empty option; the executor
   *   then picks the first non-empty option.
   * - `'random'` — one action targeting a randomly chosen option (makes the
   *   graph non-deterministic, by design).
   * - `'all'` — one action per available option, maximising coverage.
   *
   * When the option labels are unknown (no `options` captured), every strategy
   * falls back to the single empty-option action.
   */
  #selectActions(fact: ElementFact, targetUid: string, targetSelector: string, priority: number): SelectAction[] {
    const make = (option: string): SelectAction => ({ type: 'select', targetUid, targetSelector, option, priority });
    const options = (fact.options ?? []).filter((o) => o.trim() !== '');

    if (options.length === 0) return [make('')];

    switch (this.#config.selectStrategy) {
      case 'all':
        return options.map(make);
      case 'random':
        return [make(options[Math.floor(Math.random() * options.length)])];
      case 'first':
      default:
        return [make('')];
    }
  }
}
