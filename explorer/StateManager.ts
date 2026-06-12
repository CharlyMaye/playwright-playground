import { createHash } from 'crypto';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ElementFact, StateNode } from './types';

export abstract class StateManager {
  abstract captureState(facts: ElementFact[], depth: number, scopeSelector: string): StateNode;
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

  captureState(facts: ElementFact[], depth: number, scopeSelector: string): StateNode {
    const id = this.#hashFacts(facts);
    return {
      id,
      facts,
      depth,
      timestamp: Date.now(),
      scopeSelector,
    };
  }

  isNewState(stateId: string): boolean {
    return !this.#visitedStates.has(stateId);
  }

  registerState(node: StateNode): void {
    this.#visitedStates.add(node.id);
  }

  #hashFacts(facts: ElementFact[]): string {
    // 'interactive-only' hashes element identity + ARIA state; 'structure' also includes tag + role.
    const serialize =
      this.#config.domHashStrategy === 'interactive-only'
        ? (f: ElementFact) => `${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`
        : (f: ElementFact) => `${f.tag}|${f.role}|${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`;

    const dataToHash = facts
      .filter((f) => f.isInScope)
      .map(serialize)
      .sort()
      .join('\n');

    return createHash('sha256').update(dataToHash).digest('hex').substring(0, 16);
  }
}
