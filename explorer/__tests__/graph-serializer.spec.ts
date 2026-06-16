import { expect, test } from '@playwright/test';
import { ConcreteExplorationGraph } from '../ExplorationGraph';
import { graphToDOT, graphToMermaid, serializeGraph } from '../GraphSerializer';
import { CandidateAction, SerializedGraph, StateNode, Transition } from '../types';

function makeState(id: string, depth = 0): StateNode {
  return { id, facts: [], depth, timestamp: Date.now(), scopeSelector: 'body' };
}

/** A state carrying one full ElementFact, to exercise the facts projection. */
function makeStateWithFacts(id: string): StateNode {
  return {
    id,
    depth: 0,
    timestamp: Date.now(),
    scopeSelector: 'body',
    facts: [
      {
        uid: 'a[0]',
        tag: 'a',
        role: null,
        accessibleName: 'x',
        visible: true,
        enabled: true,
        focusable: true,
        text: 'hello',
        inputType: null,
        ariaExpanded: null,
        ariaControls: null,
        ariaOwns: null,
        tabindex: null,
        contentEditable: false,
        boundingBox: { x: 0, y: 0, width: 1, height: 1 },
        isInScope: true,
        parentUid: null,
        nativeSelector: '#a',
      },
    ],
  };
}

function makeTransition(from: string, to: string): Transition {
  const action: CandidateAction = { type: 'click', targetUid: `uid-${to}`, priority: 5 };
  return {
    id: `${from}->${to}`,
    from,
    to,
    action,
    success: true,
    duration: 100,
    domChanges: { appeared: [], disappeared: [], modified: [] },
  };
}

test.describe('GraphSerializer', () => {
  test.describe('serializeGraph', () => {
    test('produces serializable JSON', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('s1'));
      graph.addState(makeState('s2'));
      graph.addTransition(makeTransition('s1', 's2'));

      const json = serializeGraph(graph);
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized) as SerializedGraph;
      expect(parsed.states).toHaveLength(2);
      expect(parsed.transitions).toHaveLength(1);
    });

    test('facts default is minimal (uid + nativeSelector only)', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeStateWithFacts('s1'));

      const json = serializeGraph(graph);
      expect(json.states[0].facts).toEqual([{ uid: 'a[0]', nativeSelector: '#a' }]);
    });

    test('facts: none drops facts (empty array)', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeStateWithFacts('s1'));

      const json = serializeGraph(graph, { facts: 'none' });
      expect(json.states[0].facts).toEqual([]);
    });

    test('facts: full keeps the complete snapshot', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeStateWithFacts('s1'));

      const json = serializeGraph(graph, { facts: 'full' });
      const fact = json.states[0].facts[0];
      expect(fact).toMatchObject({ uid: 'a[0]', text: 'hello', boundingBox: { width: 1 } });
    });
  });

  test.describe('graphToMermaid', () => {
    test('produces valid Mermaid', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('abc12345'));
      graph.addState(makeState('def67890'));
      graph.addTransition(makeTransition('abc12345', 'def67890'));

      const mermaid = graphToMermaid(graph);
      expect(mermaid).toContain('stateDiagram-v2');
      expect(mermaid).toContain('-->');
    });
  });

  test.describe('graphToDOT', () => {
    test('produces valid DOT format', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('s1'));
      graph.addState(makeState('s2'));
      graph.addTransition(makeTransition('s1', 's2'));

      const dot = graphToDOT(graph);
      expect(dot).toContain('digraph {');
      expect(dot).toContain('->');
      expect(dot.trimEnd()).toMatch(/}$/);
    });
  });
});
