import { expect, test } from '@playwright/test';
import { ConcreteExplorationGraph } from '../ExplorationGraph';
import { CandidateAction, StateNode, Transition } from '../types';

function makeState(id: string, depth = 0): StateNode {
  return { id, facts: [], depth, timestamp: Date.now(), scopeSelector: 'body' };
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

test.describe('ExplorationGraph', () => {
  test.describe('addState + hasState', () => {
    test('adds and retrieves a state', () => {
      const graph = new ConcreteExplorationGraph();
      const state = makeState('s1');
      graph.addState(state);
      expect(graph.hasState('s1')).toBe(true);
      expect(graph.getState('s1')).toEqual(state);
    });

    test('does not duplicate on re-add', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('s1'));
      graph.addState(makeState('s1'));
      expect(graph.getAllStates().length).toBe(1);
    });

    test('returns undefined for unknown state', () => {
      const graph = new ConcreteExplorationGraph();
      expect(graph.getState('unknown')).toBeUndefined();
    });
  });

  test.describe('addTransition + getTransitionsFrom', () => {
    test('adds and retrieves transitions', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('s1'));
      graph.addState(makeState('s2'));
      const t = makeTransition('s1', 's2');
      graph.addTransition(t);
      expect(graph.getTransitionsFrom('s1')).toHaveLength(1);
      expect(graph.getTransitionsTo('s2')).toHaveLength(1);
    });
  });

  test.describe('getRoots / getLeaves — 3-node graph', () => {
    test('identifies roots and leaves correctly', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('root', 0));
      graph.addState(makeState('mid', 1));
      graph.addState(makeState('leaf', 2));
      graph.addTransition(makeTransition('root', 'mid'));
      graph.addTransition(makeTransition('mid', 'leaf'));

      const roots = graph.getRoots();
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('root');

      const leaves = graph.getLeaves();
      expect(leaves).toHaveLength(1);
      expect(leaves[0].id).toBe('leaf');
    });
  });

  test.describe('getScenarios — branching graph', () => {
    test('finds all root-to-leaf paths', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('root', 0));
      graph.addState(makeState('a', 1));
      graph.addState(makeState('b', 1));
      graph.addState(makeState('c', 2));
      graph.addTransition(makeTransition('root', 'a'));
      graph.addTransition(makeTransition('root', 'b'));
      graph.addTransition(makeTransition('a', 'c'));

      const scenarios = graph.getScenarios();
      // Two paths: root->a->c and root->b
      expect(scenarios).toHaveLength(2);
    });
  });

  test.describe('getCycles', () => {
    test('detects a cycle', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('a'));
      graph.addState(makeState('b'));
      graph.addTransition(makeTransition('a', 'b'));
      graph.addTransition(makeTransition('b', 'a'));

      const cycles = graph.getCycles();
      expect(cycles.length).toBeGreaterThanOrEqual(1);
    });

    test('reports no cycles in acyclic graph', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('a'));
      graph.addState(makeState('b'));
      graph.addState(makeState('c'));
      graph.addTransition(makeTransition('a', 'b'));
      graph.addTransition(makeTransition('b', 'c'));

      const cycles = graph.getCycles();
      expect(cycles).toHaveLength(0);
    });
  });

  test.describe('getDepth + getStats', () => {
    test('returns correct max depth', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('a', 0));
      graph.addState(makeState('b', 1));
      graph.addState(makeState('c', 3));
      expect(graph.getDepth()).toBe(3);
    });

    test('getStats returns correct counts', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('a', 0));
      graph.addState(makeState('b', 1));
      graph.addTransition(makeTransition('a', 'b'));
      const stats = graph.getStats();
      expect(stats.states).toBe(2);
      expect(stats.transitions).toBe(1);
      expect(stats.maxDepth).toBe(1);
    });
  });

  test.describe('getScenarios — rootless cyclic graph', () => {
    test('falls back to the shallowest state when a back-edge removes every root', () => {
      // S0 -> a -> S0 : the back-edge to the initial state means S0 has an
      // incoming non-self-loop transition, so getRoots() is empty. Without the
      // entry-point fallback this would collapse to zero scenarios despite the
      // discovered transitions.
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('s0', 0));
      graph.addState(makeState('a', 1));
      graph.addTransition(makeTransition('s0', 'a'));
      graph.addTransition(makeTransition('a', 's0'));

      expect(graph.getRoots()).toHaveLength(0);
      const scenarios = graph.getScenarios();
      expect(scenarios.length).toBeGreaterThan(0);
      // The path starts from the shallowest state (depth 0).
      expect(scenarios[0][0].from).toBe('s0');
    });

    test('returns no scenarios for an empty graph', () => {
      const graph = new ConcreteExplorationGraph();
      expect(graph.getScenarios()).toHaveLength(0);
    });
  });

  test.describe('getScenarios — bounded', () => {
    test('respects the maxScenarios cap', () => {
      const graph = new ConcreteExplorationGraph();
      graph.addState(makeState('root'));
      graph.addState(makeState('a'));
      graph.addState(makeState('b'));
      graph.addTransition(makeTransition('root', 'a'));
      graph.addTransition(makeTransition('root', 'b'));

      expect(graph.getScenarios()).toHaveLength(2);
      expect(graph.getScenarios(1)).toHaveLength(1);
    });
  });

});
