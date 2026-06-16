import { createHash } from 'crypto';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ElementFact, StateNode } from './types';

/**
 * Manages the identity of exploration states.
 *
 * Single responsibility: compute a deterministic hash from a set of
 * {@link ElementFact}s and track already-visited states to detect cycles.
 * The hashing algorithm is configured by
 * {@link ExplorationConfig.domHashStrategy}.
 */
export abstract class StateManager {
  /**
   * Builds a {@link StateNode} from a facts snapshot.
   *
   * `location` (opaque, driver-defined) is only passed in `followNavigation`
   * crawler mode — it is then included in the hash so that identical DOMs
   * on different pages are treated as distinct states.
   */
  abstract captureState(facts: ElementFact[], depth: number, scopeSelector: string, location?: string): StateNode;
  /** Returns `true` if this state identifier has not been visited yet. */
  abstract isNewState(stateId: string): boolean;
  /** Marks the state as visited so future `isNewState` calls return `false`. */
  abstract registerState(node: StateNode): void;
}

/**
 * Concrete implementation of {@link StateManager}.
 *
 * Computes the state hash via SHA-256 over the in-scope facts (`isInScope`).
 * In `'interactive-only'` mode only `uid`, visibility, enabled and
 * `ariaExpanded` are included; in `'structure'` mode tag and role are also
 * part of the hash.
 */
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
    const serialize = this.#config.domHashStrategy === 'interactive-only' ? (f: ElementFact) => `${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}` : (f: ElementFact) => `${f.tag}|${f.role}|${f.uid}|${f.visible}|${f.enabled}|${f.ariaExpanded}`;

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
