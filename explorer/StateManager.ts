import { createHash } from 'crypto';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ElementFact, StateNode } from './types';

export abstract class StateManager {
  /**
   * `location` (opaque, driver-defined) is only passed in `followNavigation`
   * crawler mode — it then becomes part of the state identity so identical
   * DOMs on different pages stay distinct states.
   */
  abstract captureState(facts: ElementFact[], depth: number, scopeSelector: string, location?: string): StateNode;
  abstract isNewState(stateId: string): boolean;
  abstract registerState(node: StateNode): void;
}

@Injector({ Provide: [ExplorationConfig] })
export class ConcreteStateManager extends StateManager {
  readonly #visitedStates = new Set<string>();
  readonly #config: ExplorationConfig;

  constructor(explorationConfig: ExplorationConfig) {
    super();
    this.#config = explorationConfig;
  }

  captureState(facts: ElementFact[], depth: number, scopeSelector: string, location?: string): StateNode {
    const id = this.#hashFacts(facts, location);
    return {
      id,
      facts,
      depth,
      timestamp: Date.now(),
      scopeSelector,
      ...(location !== undefined && { location }),
    };
  }

  isNewState(stateId: string): boolean {
    return !this.#visitedStates.has(stateId);
  }

  registerState(node: StateNode): void {
    this.#visitedStates.add(node.id);
  }

  #hashFacts(facts: ElementFact[], location?: string): string {
    // 'interactive-only' hashes element identity + ARIA state; 'structure' also includes tag + role.
    const serialize =
      this.#config.domHashStrategy === 'interactive-only'
        ? (f: ElementFact) => `${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`
        : (f: ElementFact) => `${f.tag}|${f.role}|${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`;

    const factsData = facts
      .filter((f) => f.isInScope)
      .map(serialize)
      .sort()
      .join('\n');
    // Location prefixed only when provided — keeps SPA-mode hashes identical to historical ones.
    const dataToHash = location === undefined ? factsData : `${location}\n${factsData}`;

    return createHash('sha256').update(dataToHash).digest('hex').substring(0, 16);
  }
}
