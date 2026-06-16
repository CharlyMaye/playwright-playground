import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationObserver } from './ExplorationObserver';
import { StateNode } from './types';

/**
 * Releases the heavy fact fields of a state once it leaves the exploration
 * frontier, keeping only `uid` + `nativeSelector` (all that serialization and
 * replay ever need afterwards).
 *
 * Skipped under {@link ExplorationConfig.serializeFacts} `'full'`, where the
 * caller explicitly asked to keep the complete snapshots. Cuts peak heap
 * dramatically on rich pages, where a single state can hold thousands of facts
 * and the full graph would otherwise retain them all.
 */
@Injector({ Provide: [ExplorationConfig] })
export class FactEvictionObserver extends ExplorationObserver {
  readonly #config: ExplorationConfig;

  constructor(explorationConfig: ExplorationConfig) {
    super();
    this.#config = explorationConfig;
  }

  onStateExhausted(state: StateNode): void {
    if (this.#config.serializeFacts === 'full') return;
    // Reduce to the minimal shape: identity + selector are all that
    // serialization and replay read once a node has left the frontier.
    state.facts = state.facts.map((f) => ({ uid: f.uid, nativeSelector: f.nativeSelector }));
  }
}
