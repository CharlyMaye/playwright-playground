import { ExplorationGraph } from './ExplorationGraph';
import { SerializedGraph, SerializedStateNode, StateNode } from './types';

/**
 * How much per-element detail {@link serializeGraph} emits for each state:
 * `'minimal'` keeps only `uid` + `nativeSelector`, `'none'` drops facts,
 * `'full'` keeps the complete snapshot. See {@link ExplorationConfig.serializeFacts}.
 */
export type FactsSerialization = 'full' | 'minimal' | 'none';

/**
 * Serialises an {@link ExplorationGraph} to a plain {@link SerializedGraph}
 * (states + transitions) for JSON export and HTML rendering.
 *
 * Serialisation lives here rather than on the graph itself: the graph is a data
 * structure with traversal algorithms, wire formats are a separate concern.
 *
 * @param graph         - The graph to serialise.
 * @param options.facts - Per-element detail level. Defaults to `'minimal'`.
 */
export function serializeGraph(graph: ExplorationGraph, options?: { facts?: FactsSerialization }): SerializedGraph {
  const mode = options?.facts ?? 'minimal';
  const transitions = graph.getTransitions();

  if (mode === 'full') {
    return { states: graph.getAllStates(), transitions };
  }

  const project = (s: StateNode): SerializedStateNode => ({
    ...s,
    facts: mode === 'none' ? [] : s.facts.map((f) => ({ uid: f.uid, nativeSelector: f.nativeSelector })),
  });
  return { states: graph.getAllStates().map(project), transitions };
}

/** Exports the graph in DOT (Graphviz) format. */
export function graphToDOT(graph: ExplorationGraph): string {
  const lines: string[] = ['digraph {'];

  for (const state of graph.getAllStates()) {
    const label = `d=${state.depth} f=${state.facts.length}`;
    lines.push(`  "${state.id}" [label="${state.id.substring(0, 8)}\\n${label}"];`);
  }

  for (const t of graph.getTransitions()) {
    lines.push(`  "${t.from}" -> "${t.to}" [label="${t.action.type}"];`);
  }

  lines.push('}');
  return lines.join('\n');
}

/** Exports the graph in Mermaid `stateDiagram-v2` format. */
export function graphToMermaid(graph: ExplorationGraph): string {
  const lines: string[] = ['stateDiagram-v2'];

  for (const state of graph.getAllStates()) {
    const shortId = state.id.substring(0, 8);
    lines.push(`  state "${shortId} (d=${state.depth})" as ${mermaidId(state.id)}`);
  }

  for (const t of graph.getTransitions()) {
    lines.push(`  ${mermaidId(t.from)} --> ${mermaidId(t.to)} : ${t.action.type}`);
  }

  return lines.join('\n');
}

function mermaidId(id: string): string {
  return `s_${id.substring(0, 8)}`;
}
