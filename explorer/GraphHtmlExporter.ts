import * as fs from 'fs';
import * as path from 'path';
import { getTargetUid, SerializedGraph, SerializedStateNode, Transition } from './types';

/**
 * Writes a self-contained HTML page visualising the exploration graph.
 * The page uses Mermaid.js (CDN) to render a flowchart — nodes are states,
 * edges are transitions with action labels.
 *
 * @param graph     Serialized graph from ExplorationGraph.toJSON()
 * @param outputPath  Absolute or relative path for the .html file
 * @param title     Optional page title shown in the header
 * @param stateLabels Optional short-name map (e.g. S0, S1) built during exploration
 */
export function exportGraphHtml(
  graph: SerializedGraph,
  outputPath: string,
  title = 'Exploration Graph',
  stateLabels?: Map<string, string>
): void {
  const labels = stateLabels ?? buildLabels(graph.states);
  const { mermaid } = buildFlowchart(graph, labels);
  const html = buildHtml(title, mermaid, graph, labels);
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, html, 'utf8');
}

// ─── Mermaid flowchart ────────────────────────────────────────────────────────

function buildLabels(states: SerializedStateNode[]): Map<string, string> {
  const sorted = [...states].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  return new Map(sorted.map((s, i) => [s.id, `S${i}`]));
}

function nodeId(stateId: string): string {
  // Mermaid node IDs: alphanumeric + underscore only, no leading digit
  return `n_${stateId.substring(0, 12)}`;
}

function mermaidEscape(s: string): string {
  return s.replace(/"/g, '#quot;').replace(/[<>]/g, '').replace(/\n/g, ' ').substring(0, 30);
}

function edgeLabel(t: Transition): string {
  if (t.action.type === 'sequence') return 'sequence';
  const uid = getTargetUid(t.action);
  const short = uid.replace(/^testid:/, '').replace(/^aria:/, '').substring(0, 22);
  return mermaidEscape(`${t.action.type}:${short}`);
}

function buildFlowchart(graph: SerializedGraph, labels: Map<string, string>): { mermaid: string } {
  const lines: string[] = ['flowchart TD'];

  lines.push('  classDef root fill:#22c55e,stroke:#16a34a,color:#fff,font-weight:bold');
  lines.push('  classDef normal fill:#3b82f6,stroke:#2563eb,color:#fff');
  lines.push('  classDef leaf fill:#f59e0b,stroke:#d97706,color:#fff');
  lines.push('  classDef ext fill:#94a3b8,stroke:#64748b,color:#fff,stroke-dasharray:5 5');
  lines.push('');

  const hasOutgoing = new Set(graph.transitions.filter((t) => !t.selfLoop && t.to !== '__external_navigation__').map((t) => t.from));
  const hasIncoming = new Set(graph.transitions.filter((t) => !t.selfLoop && t.from !== '__external_navigation__').map((t) => t.to));

  const sortedStates = [...graph.states].sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  for (const s of sortedStates) {
    const label = labels.get(s.id) ?? s.id.substring(0, 8);
    const factsCount = s.facts?.length ?? '?';
    const nodeLabel = mermaidEscape(`${label}\\nd=${s.depth} f=${factsCount}`);
    const isRoot = !hasIncoming.has(s.id);
    const isLeaf = !hasOutgoing.has(s.id);
    const cls = isRoot ? 'root' : isLeaf ? 'leaf' : 'normal';
    lines.push(`  ${nodeId(s.id)}["${nodeLabel}"]:::${cls}`);
  }

  const hasExternal = graph.transitions.some((t) => t.to === '__external_navigation__');
  if (hasExternal) {
    lines.push('  __ext__(["⎋ external"]):::ext');
  }
  lines.push('');

  for (const t of graph.transitions) {
    if (t.from === '__external_navigation__') continue;
    const from = nodeId(t.from);
    const to = t.to === '__external_navigation__' ? '__ext__' : nodeId(t.to);
    const label = edgeLabel(t);
    const arrow = t.selfLoop ? '-.->|' : '-->|';
    lines.push(`  ${from} ${arrow}"${label}"| ${to}`);
  }

  return { mermaid: lines.join('\n') };
}

// ─── HTML template ─────────────────────────────────────────────────────────────

function buildHtml(title: string, mermaid: string, graph: SerializedGraph, labels: Map<string, string>): string {
  const stats = {
    states: graph.states.length,
    transitions: graph.transitions.filter((t) => t.to !== '__external_navigation__').length,
    maxDepth: graph.states.length > 0 ? Math.max(...graph.states.map((s) => s.depth)) : 0,
    selfLoops: graph.transitions.filter((t) => t.selfLoop).length,
    external: graph.transitions.filter((t) => t.to === '__external_navigation__').length,
  };

  const stateRows = [...graph.states]
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id))
    .map((s) => {
      const label = labels.get(s.id) ?? '?';
      const out = graph.transitions.filter((t) => t.from === s.id && !t.selfLoop);
      const targets = out
        .map((t) => {
          if (t.to === '__external_navigation__') return `<span class="ext">⎋ external</span>`;
          return `<span class="lbl">${labels.get(t.to) ?? t.to.substring(0, 8)}</span>`;
        })
        .join(' ');
      const location = s.location ? `<code>${s.location}</code>` : '—';
      return `<tr>
        <td><strong>${label}</strong></td>
        <td>${s.depth}</td>
        <td>${s.facts?.length ?? '?'}</td>
        <td>${location}</td>
        <td>${targets || '—'}</td>
        <td><code style="font-size:0.7em;color:#64748b">${s.id.substring(0, 16)}…</code></td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #1e293b; }
    header { background: #1e293b; color: #f8fafc; padding: 1.5rem 2rem; }
    header h1 { font-size: 1.4rem; margin-bottom: 0.75rem; }
    .stats { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .stat { background: rgba(255,255,255,0.1); border-radius: 8px; padding: 0.5rem 1rem; }
    .stat-val { font-size: 1.5rem; font-weight: bold; }
    .stat-lbl { font-size: 0.75rem; opacity: 0.7; }
    main { padding: 2rem; max-width: 1400px; margin: 0 auto; }
    section { margin-bottom: 2rem; }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: #475569; }
    .graph-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; overflow-x: auto; }
    .mermaid { min-height: 200px; }
    .fallback { display: none; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    th { background: #f1f5f9; text-align: left; padding: 0.6rem 1rem; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; }
    td { padding: 0.6rem 1rem; border-top: 1px solid #f1f5f9; font-size: 0.88rem; vertical-align: middle; }
    tr:hover td { background: #f8fafc; }
    .lbl { background: #dbeafe; color: #1d4ed8; border-radius: 4px; padding: 1px 6px; font-size: 0.78rem; font-weight: 600; }
    .ext { background: #f1f5f9; color: #64748b; border-radius: 4px; padding: 1px 6px; font-size: 0.78rem; }
    .legend { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; font-size: 0.82rem; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-root { background: #22c55e; }
    .dot-normal { background: #3b82f6; }
    .dot-leaf { background: #f59e0b; }
    .dot-ext { background: #94a3b8; }
    .no-mermaid { background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem; margin-top: 1rem; display: none; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1.5rem; border-radius: 8px; overflow-x: auto; font-size: 0.82rem; line-height: 1.5; }
  </style>
</head>
<body>
<header>
  <h1>🗺️ ${escapeHtml(title)}</h1>
  <div class="stats">
    <div class="stat"><div class="stat-val">${stats.states}</div><div class="stat-lbl">States</div></div>
    <div class="stat"><div class="stat-val">${stats.transitions}</div><div class="stat-lbl">Transitions</div></div>
    <div class="stat"><div class="stat-val">${stats.maxDepth}</div><div class="stat-lbl">Max depth</div></div>
    <div class="stat"><div class="stat-val">${stats.selfLoops}</div><div class="stat-lbl">Self-loops</div></div>
    <div class="stat"><div class="stat-val">${stats.external}</div><div class="stat-lbl">External nav</div></div>
  </div>
</header>
<main>
  <section>
    <div class="legend">
      <span class="legend-item"><span class="dot dot-root"></span> Initial state</span>
      <span class="legend-item"><span class="dot dot-normal"></span> State</span>
      <span class="legend-item"><span class="dot dot-leaf"></span> Dead end (no outgoing)</span>
      <span class="legend-item"><span class="dot dot-ext"></span> External navigation</span>
      <span style="color:#64748b;font-size:0.8rem">Dashed arrows = self-loops</span>
    </div>
    <div class="graph-box">
      <div class="mermaid">${mermaid}</div>
    </div>
    <div class="no-mermaid" id="fallback">
      <strong>⚠️ Mermaid not loaded (offline?)</strong> — raw diagram source:
      <pre>${escapeHtml(mermaid)}</pre>
    </div>
  </section>
  <section>
    <h2>States</h2>
    <table>
      <thead><tr><th>Label</th><th>Depth</th><th>Facts</th><th>Location</th><th>Transitions to</th><th>ID (truncated)</th></tr></thead>
      <tbody>${stateRows}</tbody>
    </table>
  </section>
</main>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default', flowchart: { curve: 'basis', useMaxWidth: false } });
  mermaid.run().catch(() => {
    document.getElementById('fallback').style.display = 'block';
  });
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
