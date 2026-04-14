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

  constructor(protected explorationConfig: ExplorationConfig) {
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
    const strategy = this.#config.domHashStrategy;

    let dataToHash: string;

    if (strategy === 'interactive-only') {
      // Hash only interactive elements' identity + ARIA state
      const interactiveData = facts
        .filter((f) => f.isInScope)
        .map((f) => `${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`)
        .sort()
        .join('\n');
      dataToHash = interactiveData;
    } else {
      // Hash full structure: tags + roles + visibility + enabled state
      const structureData = facts
        .filter((f) => f.isInScope)
        .map((f) => `${f.tag}|${f.role}|${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`)
        .sort()
        .join('\n');
      dataToHash = structureData;
    }

    return createHash('sha256').update(dataToHash).digest('hex').substring(0, 16);
  }
}
