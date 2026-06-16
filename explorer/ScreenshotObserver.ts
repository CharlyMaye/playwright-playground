import * as fs from 'fs';
import * as path from 'path';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationObserver } from './ExplorationObserver';
import { NavigationDriver } from './NavigationDriver';
import { CandidateAction, getTargetUid, StateNode } from './types';

/**
 * Captures best-effort PNG screenshots at each state and transition, for visual
 * debugging of the exploration graph.
 *
 * Silent no-op unless {@link ExplorationConfig.screenshotsDir} is set and the
 * matching capture flag is on. Errors are swallowed: a missing screenshot must
 * never break exploration.
 */
@Injector({ Provide: [NavigationDriver, ExplorationConfig] })
export class ScreenshotObserver extends ExplorationObserver {
  readonly #navigation: NavigationDriver;
  readonly #config: ExplorationConfig;
  /** Running index used to order transition screenshots on disk. */
  #transitionCounter = 0;

  constructor(navigationDriver: NavigationDriver, explorationConfig: ExplorationConfig) {
    super();
    this.#navigation = navigationDriver;
    this.#config = explorationConfig;
  }

  onStart(): void {
    this.#transitionCounter = 0;
  }

  async onStateCaptured(state: StateNode): Promise<void> {
    await this.#capture('state', state.id);
  }

  async onActionExecuted(action: CandidateAction): Promise<void> {
    await this.#capture('transition', this.#actionLabel(action));
  }

  async #capture(kind: 'state' | 'transition', label: string): Promise<void> {
    const dir = this.#config.screenshotsDir;
    if (!dir) return;
    const enabled = kind === 'state' ? this.#config.captureStateScreenshots : this.#config.captureTransitionScreenshots;
    if (!enabled) return;

    try {
      fs.mkdirSync(dir, { recursive: true });
      const prefix = this.#config.screenshotsPrefix ? `${this.#config.screenshotsPrefix}-` : '';
      const safe = label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
      const counter = kind === 'transition' ? `${String(this.#transitionCounter++).padStart(4, '0')}-` : '';
      const file = path.join(dir, `${prefix}${kind}-${counter}${safe}.png`);
      await this.#navigation.captureScreenshot(file);
    } catch {
      // best-effort
    }
  }

  #actionLabel(action: CandidateAction): string {
    if (action.type === 'sequence') {
      const types = action.steps.map((s) => s.action.type).join('+');
      return `sequence-${types}`;
    }
    return `${action.type}-${getTargetUid(action)}`;
  }
}
