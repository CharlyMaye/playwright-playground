import { Injector } from '../engine';
import { ExplorationObserver } from './ExplorationObserver';
import { FactEvictionObserver } from './FactEvictionObserver';
import { ScreenshotObserver } from './ScreenshotObserver';
import { CandidateAction, StateNode } from './types';

/**
 * Default {@link ExplorationObserver} binding: fans every lifecycle event out
 * to an ordered list of observers (screenshot capture, then fact eviction).
 *
 * Awaiting sequentially keeps the order deterministic — screenshots are taken
 * before facts are evicted. Add further observers by extending the constructor
 * wiring and the `Provide` list.
 */
@Injector({ Provide: [ScreenshotObserver, FactEvictionObserver] })
export class CompositeExplorationObserver extends ExplorationObserver {
  readonly #observers: readonly ExplorationObserver[];

  constructor(screenshotObserver: ScreenshotObserver, factEvictionObserver: FactEvictionObserver) {
    super();
    this.#observers = [screenshotObserver, factEvictionObserver];
  }

  async onStart(): Promise<void> {
    for (const observer of this.#observers) await observer.onStart?.();
  }

  async onStateCaptured(state: StateNode): Promise<void> {
    for (const observer of this.#observers) await observer.onStateCaptured?.(state);
  }

  async onActionExecuted(action: CandidateAction): Promise<void> {
    for (const observer of this.#observers) await observer.onActionExecuted?.(action);
  }

  async onStateExhausted(state: StateNode): Promise<void> {
    for (const observer of this.#observers) await observer.onStateExhausted?.(state);
  }
}
