import { ExplorationGraph } from './ExplorationGraph';
import { CandidateAction, getTargetUid, Transition } from './types';

/**
 * Test scenario derived from a root-to-leaf path in the exploration graph.
 *
 * A scenario is the linear projection of an acyclic path into an ordered
 * sequence of replayable actions for a Playwright test or any other driver.
 */
export type Scenario = {
  /** Human-readable name built by concatenating action labels (`type_uid → type_uid → …`). */
  name: string;
  /** Sequence of candidate actions to execute to reproduce the path. */
  steps: CandidateAction[];
  /** De-duplicated UIDs of all target elements involved in the steps. */
  targetUids: string[];
};

/**
 * Builds replayable test scenarios from an {@link ExplorationGraph}.
 *
 * Single responsibility: turn root-to-leaf graph paths into ordered
 * {@link Scenario} action sequences. Raw graph serialisation (JSON, Mermaid,
 * DOT) belongs to {@link GraphSerializer}, not here.
 */
export abstract class ScenarioExporter {
  /** Returns the scenarios derived from each root-to-leaf path in the graph. */
  abstract exportScenarios(): Scenario[];
}

/**
 * Concrete implementation of {@link ScenarioExporter}.
 *
 * Builds scenarios by converting each root-to-leaf path returned by
 * {@link ExplorationGraph.getScenarios} into a {@link Scenario} object.
 */
export class ConcreteScenarioExporter extends ScenarioExporter {
  readonly #graph: ExplorationGraph;

  constructor(graph: ExplorationGraph) {
    super();
    this.#graph = graph;
  }

  exportScenarios(): Scenario[] {
    const paths = this.#graph.getScenarios();
    return paths.map((path) => this.#pathToScenario(path));
  }

  #pathToScenario(path: Transition[]): Scenario {
    const steps = path.map((t) => t.action);
    const targetUids = this.#extractTargetUids(steps);
    const name = steps.map((s) => this.#actionLabel(s)).join(' → ');
    return { name, steps, targetUids };
  }

  #actionLabel(action: CandidateAction): string {
    if (action.type === 'sequence') {
      return `sequence(${action.steps.map((s) => `${s.action.type}_${s.action.targetUid}`).join('+')})`;
    }
    return `${action.type}_${getTargetUid(action)}`;
  }

  #extractTargetUids(actions: CandidateAction[]): string[] {
    const uids = new Set<string>();
    for (const action of actions) {
      if (action.type === 'sequence') {
        for (const step of action.steps) {
          uids.add(step.action.targetUid);
        }
      } else {
        uids.add(getTargetUid(action));
      }
    }
    return [...uids];
  }
}
