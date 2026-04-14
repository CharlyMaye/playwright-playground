import { ExplorationGraph } from './ExplorationGraph';
import { CandidateAction, SerializedGraph, Transition } from './types';

export type Scenario = {
  name: string;
  steps: CandidateAction[];
  selectors: string[];
};

export abstract class ScenarioExporter {
  abstract exportScenarios(): Scenario[];
  abstract exportJSON(): SerializedGraph;
  abstract exportMermaid(): string;
  abstract exportDOT(): string;
}

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

  exportJSON(): SerializedGraph {
    return this.#graph.toJSON();
  }

  exportMermaid(): string {
    return this.#graph.toMermaid();
  }

  exportDOT(): string {
    return this.#graph.toDOT();
  }

  #pathToScenario(path: Transition[]): Scenario {
    const steps = path.map((t) => t.action);
    const selectors = this.#extractSelectors(steps);
    const name = steps.map((s) => this.#actionLabel(s)).join(' → ');
    return { name, steps, selectors };
  }

  #actionLabel(action: CandidateAction): string {
    if (action.type === 'sequence') {
      return `sequence(${action.steps.map((s) => `${s.action.type}_${s.action.targetUid}`).join('+')})`;
    }
    const target = (action as { targetUid: string }).targetUid ?? '';
    return `${action.type}_${target}`;
  }

  #extractSelectors(actions: CandidateAction[]): string[] {
    const selectors = new Set<string>();
    for (const action of actions) {
      if (action.type === 'sequence') {
        for (const step of action.steps) {
          selectors.add(step.action.targetUid);
        }
      } else {
        selectors.add((action as { targetUid: string }).targetUid);
      }
    }
    return [...selectors];
  }
}
