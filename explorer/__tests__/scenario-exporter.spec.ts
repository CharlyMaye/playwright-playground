import { expect, test } from '@playwright/test';
import { ConcreteExplorationGraph } from '../ExplorationGraph';
import { ConcreteScenarioExporter } from '../ScenarioExporter';
import { CandidateAction, StateNode, Transition } from '../types';

function makeState(id: string, depth = 0): StateNode {
  return { id, facts: [], depth, timestamp: Date.now(), scopeSelector: 'body' };
}

function makeTransition(from: string, to: string, action?: CandidateAction): Transition {
  const defaultAction: CandidateAction = { type: 'click', targetUid: `uid-${to}`, priority: 5 };
  return {
    id: `${from}->${to}`,
    from,
    to,
    action: action ?? defaultAction,
    success: true,
    duration: 100,
    domChanges: { appeared: [], disappeared: [], modified: [] },
  };
}

test.describe('ScenarioExporter', () => {
  test('exports scenarios from a linear graph', () => {
    const graph = new ConcreteExplorationGraph();
    graph.addState(makeState('s0', 0));
    graph.addState(makeState('s1', 1));
    graph.addState(makeState('s2', 2));
    graph.addTransition(makeTransition('s0', 's1'));
    graph.addTransition(makeTransition('s1', 's2'));

    const exporter = new ConcreteScenarioExporter(graph);
    const scenarios = exporter.exportScenarios();

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].steps).toHaveLength(2);
    expect(scenarios[0].name).toContain('click');
    expect(scenarios[0].targetUids.length).toBeGreaterThan(0);
  });

  test('exports scenarios from a branching graph', () => {
    const graph = new ConcreteExplorationGraph();
    graph.addState(makeState('root', 0));
    graph.addState(makeState('a', 1));
    graph.addState(makeState('b', 1));
    graph.addTransition(makeTransition('root', 'a'));
    graph.addTransition(makeTransition('root', 'b'));

    const exporter = new ConcreteScenarioExporter(graph);
    const scenarios = exporter.exportScenarios();
    expect(scenarios).toHaveLength(2);
  });

  test('handles sequence actions in scenario name', () => {
    const graph = new ConcreteExplorationGraph();
    graph.addState(makeState('s0'));
    graph.addState(makeState('s1'));
    const seqAction: CandidateAction = {
      type: 'sequence',
      steps: [
        { action: { type: 'click', targetUid: 'btn1', priority: 10 } },
        { action: { type: 'fill', targetUid: 'input1', value: 'test', priority: 8 } },
      ],
      priority: 12,
    };
    graph.addTransition(makeTransition('s0', 's1', seqAction));

    const exporter = new ConcreteScenarioExporter(graph);
    const scenarios = exporter.exportScenarios();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toContain('sequence');
    expect(scenarios[0].targetUids).toContain('btn1');
    expect(scenarios[0].targetUids).toContain('input1');
  });
});
