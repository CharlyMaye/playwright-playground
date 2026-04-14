import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConcreteTestContext } from '../engine/test.context';
import { ConcreteActionExecutor } from '../explorer/ActionExecutor';
import { ConcreteDOMExtractor } from '../explorer/DOMExtractor';
import { ConcreteExplorationConfig, PartialExplorationConfig } from '../explorer/ExplorationConfig';
import { ConcreteExplorationGraph } from '../explorer/ExplorationGraph';
import { ConcreteExplorationScope } from '../explorer/ExplorationScope';
import { ConcreteExplorer } from '../explorer/Explorer';
import { ConcreteRulesEngine } from '../explorer/RulesEngine';
import { ConcreteStateManager } from '../explorer/StateManager';

const IANA_URL = 'https://www.iana.org/help/example-domains';

const IANA_BASE_CONFIG: PartialExplorationConfig = {
  boundary: 'strict',
  strategy: 'bfs',
  maxDepth: 1,
  maxStates: 50,
  timeout: 15_000,
  stabilizationTimeout: 300,
  domHashStrategy: 'interactive-only',
  ignoreSelectors: [],
  ignoreRepeatedElements: false,
  fillValues: {},
  selectStrategy: 'first',
};

function createTestContext(page: import('@playwright/test').Page): ConcreteTestContext {
  const ctx = new ConcreteTestContext();
  ctx.page = page;
  return ctx;
}

function createExplorer(page: import('@playwright/test').Page, overrides: Partial<PartialExplorationConfig>) {
  const config = new ConcreteExplorationConfig({ ...IANA_BASE_CONFIG, ...overrides });
  const testContext = createTestContext(page);
  const scope = new ConcreteExplorationScope(testContext, config);
  const extractor = new ConcreteDOMExtractor(scope, config);
  const rulesEngine = new ConcreteRulesEngine(config);
  const actionExecutor = new ConcreteActionExecutor(testContext, scope, config);
  const stateManager = new ConcreteStateManager(config);
  const graph = new ConcreteExplorationGraph();
  const explorer = new ConcreteExplorer(
    testContext,
    scope,
    extractor,
    rulesEngine,
    actionExecutor,
    stateManager,
    graph,
    config
  );
  return { explorer, graph, extractor, rulesEngine, config };
}

test.describe('IANA Exploration — Validation Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test('explores full page (body)', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph, extractor, rulesEngine } = createExplorer(page, {
      rootSelector: 'body',
      maxDepth: 1,
      maxStates: 5,
      maxActionsPerState: 5,
      timeout: 30_000,
    });

    await explorer.explore();

    // Root state exists
    const roots = graph.getRoots();
    expect(roots).toHaveLength(1);
    const rootState = roots[0];
    expect(rootState.facts.length).toBeGreaterThan(0);

    // At least 20 links detected
    const links = rootState.facts.filter((f) => f.tag === 'a');
    expect(links.length).toBeGreaterThanOrEqual(20);

    // No buttons, inputs, selects, comboboxes (static page)
    const nonLinkInteractive = rootState.facts.filter(
      (f) => f.tag === 'button' || f.tag === 'input' || f.tag === 'select'
    );
    expect(nonLinkInteractive).toHaveLength(0);

    // RFC links are present
    const rfcTexts = rootState.facts.map((f) => f.accessibleName ?? f.text ?? '').join(' ');
    expect(rfcTexts).toContain('2606');
    expect(rfcTexts).toContain('6761');

    // Actions are all clicks (links only)
    const initialFacts = await extractor.extract();
    const actions = await rulesEngine.evaluate(initialFacts);
    const nonClickActions = actions.filter((a) => a.type !== 'click');
    expect(nonClickActions).toHaveLength(0);

    // Actions sorted by priority descending
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i].priority).toBeLessThanOrEqual(actions[i - 1].priority);
    }
  });

  test('scopes to navigation (header)', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'header',
      maxDepth: 1,
      maxStates: 20,
      timeout: 10_000,
    });

    await explorer.explore();

    const roots = graph.getRoots();
    expect(roots).toHaveLength(1);
    const rootState = roots[0];

    // Only header links (~5: logo, Domains, Protocols, Numbers, About)
    const factNames = rootState.facts.map((f) => (f.accessibleName ?? f.text ?? '').toLowerCase());

    // Should NOT contain footer/content links
    expect(factNames.join(' ')).not.toContain('privacy policy');
    expect(factNames.join(' ')).not.toContain('terms of service');
    expect(factNames.join(' ')).not.toContain('rfc 2606');
    expect(factNames.join(' ')).not.toContain('rfc 6761');

    // Reasonable number of states
    expect(graph.getAllStates().length).toBeLessThanOrEqual(10);
    const stats = graph.getStats();
    expect(stats.states).toBe(graph.getAllStates().length);
  });

  test('scopes to main content (main)', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'main',
      maxDepth: 1,
      maxStates: 20,
      timeout: 10_000,
    });

    await explorer.explore();

    const roots = graph.getRoots();
    expect(roots).toHaveLength(1);
    const rootState = roots[0];

    // RFC links detected
    const factNames = rootState.facts.map((f) => (f.accessibleName ?? f.text ?? '').toLowerCase());
    const allText = factNames.join(' ');
    expect(allText).toContain('2606');
    expect(allText).toContain('6761');

    // No header nav links
    expect(allText).not.toContain('protocols');
    expect(allText).not.toContain('privacy policy');

    // 3 links in main content
    expect(rootState.facts.filter((f) => f.tag === 'a').length).toBeGreaterThanOrEqual(2);
  });

  test('scopes to footer', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'footer',
      maxDepth: 1,
      maxStates: 30,
      timeout: 10_000,
    });

    await explorer.explore();

    const roots = graph.getRoots();
    expect(roots).toHaveLength(1);
    const rootState = roots[0];

    const factNames = rootState.facts.map((f) => (f.accessibleName ?? f.text ?? '').toLowerCase());
    const allText = factNames.join(' ');

    // Footer links present
    expect(allText).toMatch(/privacy|terms/);

    // No main content links
    expect(allText).not.toContain('rfc 2606');
    expect(allText).not.toContain('rfc 6761');
  });

  test('scopes to body content (#body)', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: '#body',
      maxDepth: 1,
      maxStates: 20,
      timeout: 10_000,
    });

    await explorer.explore();

    const roots = graph.getRoots();
    expect(roots).toHaveLength(1);
    const rootState = roots[0];

    const factNames = rootState.facts.map((f) => (f.accessibleName ?? f.text ?? '').toLowerCase());
    const allText = factNames.join(' ');

    // Body content includes main links (RFC 2606, 6761)
    expect(allText).toContain('2606');
    expect(allText).toContain('6761');

    // Should only contain main content links (3 links)
    expect(rootState.facts.filter((f) => f.tag === 'a').length).toBeGreaterThanOrEqual(2);

    // No footer links
    expect(allText).not.toContain('privacy policy');
  });

  test('respects maxDepth:0 — initial state only', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'body',
      maxDepth: 0,
      maxStates: 50,
    });

    await explorer.explore();

    // Only initial state, no transitions
    expect(graph.getAllStates()).toHaveLength(1);
    const scenarios = graph.getScenarios();
    expect(scenarios.length).toBeLessThanOrEqual(1);

    // Facts are still extracted
    const rootState = graph.getRoots()[0];
    expect(rootState.facts.length).toBeGreaterThan(0);
  });

  test('respects maxStates limit', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'body',
      maxStates: 3,
      maxDepth: 10,
    });

    await explorer.explore();

    expect(graph.getAllStates().length).toBeLessThanOrEqual(3);
  });

  test('respects timeout', async ({ page }) => {
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const start = Date.now();

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'body',
      timeout: 2_000,
      maxDepth: 10,
      maxStates: 1000,
    });

    await explorer.explore();
    const elapsed = Date.now() - start;

    // Should finish within ~3s tolerance
    expect(elapsed).toBeLessThan(5_000);

    // At least initial state
    expect(graph.getAllStates().length).toBeGreaterThanOrEqual(1);
  });

  test('exports graph in JSON, Mermaid, and DOT formats', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'main',
      maxDepth: 1,
      maxStates: 5,
      maxActionsPerState: 3,
    });

    await explorer.explore();

    // JSON
    const jsonData = graph.toJSON();
    const roundTripped = JSON.parse(JSON.stringify(jsonData)) as typeof jsonData;
    expect(roundTripped.states).toBeDefined();
    expect(roundTripped.transitions).toBeDefined();
    expect(roundTripped.states.length).toBeGreaterThanOrEqual(1);

    // Mermaid
    const mermaid = graph.toMermaid();
    expect(mermaid).toMatch(/stateDiagram|graph/);

    // DOT
    const dot = graph.toDOT();
    expect(dot).toContain('digraph {');
    expect(dot.trimEnd()).toMatch(/}$/);

    // Persist exports
    const resultsDir = path.resolve(__dirname, '..', 'test-results');
    fs.mkdirSync(resultsDir, { recursive: true });
    fs.writeFileSync(path.join(resultsDir, 'iana-exploration-graph.json'), JSON.stringify(jsonData, null, 2));
    fs.writeFileSync(path.join(resultsDir, 'iana-exploration-graph.md'), `\`\`\`mermaid\n${mermaid}\n\`\`\``);
  });

  test('produces idempotent results across runs', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const run = async () => {
      // Navigate fresh each run
      await page.goto(IANA_URL, { waitUntil: 'load' });
      const { explorer, graph } = createExplorer(page, {
        rootSelector: 'main',
        maxDepth: 1,
        maxStates: 5,
        maxActionsPerState: 3,
        strategy: 'bfs',
      });
      await explorer.explore();
      return graph;
    };

    const graph1 = await run();
    const graph2 = await run();

    // Same number of states and transitions
    expect(graph1.getAllStates()).toHaveLength(graph2.getAllStates().length);
    expect(graph1.getStats().transitions).toBe(graph2.getStats().transitions);

    // Same initial state hash
    expect(graph1.getRoots()[0].id).toBe(graph2.getRoots()[0].id);

    // Same state IDs (timestamps may differ)
    const ids1 = graph1
      .getAllStates()
      .map((s) => s.id)
      .sort();
    const ids2 = graph2
      .getAllStates()
      .map((s) => s.id)
      .sort();
    expect(ids1).toEqual(ids2);
  });

  test('produces star graph structure at depth 1', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(IANA_URL, { waitUntil: 'load' });

    const { explorer, graph } = createExplorer(page, {
      rootSelector: 'main',
      maxDepth: 1,
      maxStates: 10,
      maxActionsPerState: 5,
      strategy: 'bfs',
    });

    await explorer.explore();

    // Single root
    expect(graph.getRoots()).toHaveLength(1);

    // Leaves exist (states reached in 1 click)
    expect(graph.getLeaves().length).toBeGreaterThanOrEqual(1);

    // No cycles at depth 1
    expect(graph.getCycles()).toHaveLength(0);

    // Star structure: all transitions from root
    const rootState = graph.getRoots()[0];
    const rootTransitions = graph.getTransitionsFrom(rootState.id);
    expect(rootTransitions).toEqual(expect.arrayContaining([expect.anything()]));

    // Every non-root state is a leaf at depth 1
    const nonRoots = graph.getAllStates().filter((s) => s.id !== rootState.id);
    for (const state of nonRoots) {
      expect(graph.getTransitionsFrom(state.id)).toHaveLength(0);
    }
  });
});
