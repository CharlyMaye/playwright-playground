import { expect, test } from '@playwright/test';
import path from 'path';
import { ConcreteTestContext } from '../../engine/test.context';
import { ConcreteActionExecutor } from '../ActionExecutor';
import { ConcreteDOMExtractor } from '../DOMExtractor';
import { ConcreteExplorationConfig } from '../ExplorationConfig';
import { ConcreteExplorationGraph } from '../ExplorationGraph';
import { ConcreteExplorationScope } from '../ExplorationScope';
import { ConcreteExplorer } from '../Explorer';
import { ConcreteRulesEngine } from '../RulesEngine';
import { ConcreteScenarioExporter } from '../ScenarioExporter';
import { ConcreteStateManager } from '../StateManager';

const TEST_PAGE = `file://${path.resolve(__dirname, 'test-page.html')}`;

test.describe('Explorer — Integration with local HTML page', () => {
  test('detects interactive elements in main container (strict scope)', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'load' });

    const config = new ConcreteExplorationConfig({
      rootSelector: '#main-container',
      boundary: 'strict',
      strategy: 'bfs',
      maxDepth: 0, // Only extract initial state, no actions
      maxStates: 10,
      timeout: 10_000,
      stabilizationTimeout: 200,
    });

    const testContext = new ConcreteTestContext();
    testContext.page = page;

    const scope = new ConcreteExplorationScope(testContext, config);
    const extractor = new ConcreteDOMExtractor(scope, config);

    const facts = await extractor.extract();

    // Should detect: 2 buttons, 1 text input, 1 select, 1 checkbox, label elements
    const buttons = facts.filter((f) => f.tag === 'button');
    expect(buttons.length).toBe(2);

    const inputs = facts.filter((f) => f.tag === 'input');
    expect(inputs.length).toBeGreaterThanOrEqual(2); // text + checkbox

    const selects = facts.filter((f) => f.tag === 'select');
    expect(selects.length).toBe(1);

    // Outside link should NOT be detected (strict scope)
    const outsideLink = facts.find((f) => f.uid === 'testid:outside-link');
    expect(outsideLink).toBeUndefined();
  });

  test('rules engine produces correct actions for detected elements', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'load' });

    const config = new ConcreteExplorationConfig({
      rootSelector: '#main-container',
      boundary: 'strict',
      strategy: 'bfs',
      maxDepth: 0,
      maxStates: 10,
      timeout: 10_000,
      stabilizationTimeout: 200,
    });

    const testContext = new ConcreteTestContext();
    testContext.page = page;

    const scope = new ConcreteExplorationScope(testContext, config);
    const extractor = new ConcreteDOMExtractor(scope, config);
    const rulesEngine = new ConcreteRulesEngine(config);

    const facts = await extractor.extract();
    const actions = await rulesEngine.evaluate(facts);

    // Should have click actions for buttons, fill for input, select for select, click for checkbox
    const clickActions = actions.filter((a) => a.type === 'click');
    expect(clickActions.length).toBeGreaterThanOrEqual(2); // At least 2 buttons

    const fillActions = actions.filter((a) => a.type === 'fill');
    expect(fillActions.length).toBeGreaterThanOrEqual(1); // At least 1 text input

    const selectActions = actions.filter((a) => a.type === 'select');
    expect(selectActions.length).toBeGreaterThanOrEqual(1); // 1 select

    // Actions should be sorted by priority (descending)
    for (let i = 1; i < actions.length; i++) {
      expect(actions[i].priority).toBeLessThanOrEqual(actions[i - 1].priority);
    }
  });

  test('state manager produces different hashes for different DOMs', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'load' });

    const config = new ConcreteExplorationConfig({
      rootSelector: '#main-container',
      boundary: 'strict',
      stabilizationTimeout: 200,
      domHashStrategy: 'interactive-only',
    });

    const testContext = new ConcreteTestContext();
    testContext.page = page;

    const scope = new ConcreteExplorationScope(testContext, config);
    const extractor = new ConcreteDOMExtractor(scope, config);
    const stateManager = new ConcreteStateManager(config);

    // Capture initial state
    const factsBefore = await extractor.extract();
    const stateBefore = stateManager.captureState(factsBefore, 0, config.rootSelector);

    // Click the checkbox to reveal the hidden field
    await page.click('#reveal-checkbox');
    await page.waitForTimeout(300);

    // Capture state after checkbox
    const factsAfter = await extractor.extract();
    const stateAfter = stateManager.captureState(factsAfter, 1, config.rootSelector);

    // States should be different (hidden input now visible changes the hash)
    expect(stateBefore.id).not.toBe(stateAfter.id);
    // The extra-input is now visible, verify visibility changed
    const extraBefore = factsBefore.find((f) => f.uid === 'testid:extra-input');
    const extraAfter = factsAfter.find((f) => f.uid === 'testid:extra-input');
    expect(extraBefore?.visible).toBe(false);
    expect(extraAfter?.visible).toBe(true);
  });

  test('full exploration with maxDepth:1 produces a star graph', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'load' });

    const config = new ConcreteExplorationConfig({
      rootSelector: '#main-container',
      boundary: 'strict',
      strategy: 'bfs',
      maxDepth: 1,
      maxStates: 20,
      maxActionsPerState: 5,
      timeout: 15_000,
      stabilizationTimeout: 200,
    });

    const testContext = new ConcreteTestContext();
    testContext.page = page;

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

    const resultGraph = await explorer.explore();

    // Should have at least 1 state (initial)
    expect(resultGraph.getAllStates().length).toBeGreaterThanOrEqual(1);

    // Should have exactly 1 root
    expect(resultGraph.getRoots()).toHaveLength(1);

    // All transitions should originate from the root (star graph at depth 1)
    const rootState = resultGraph.getRoots()[0];
    const transitions = resultGraph.getTransitionsFrom(rootState.id);
    expect(transitions.length).toBeGreaterThanOrEqual(1);

    // Max depth should be <= 1
    expect(resultGraph.getDepth()).toBeLessThanOrEqual(1);

    // No cycles at depth 1
    expect(resultGraph.getCycles()).toHaveLength(0);

    // Summary should be available
    const summary = explorer.getSummary();
    expect(summary.statesDiscovered).toBeGreaterThanOrEqual(1);
    expect(summary.totalDuration).toBeGreaterThan(0);
  });

  test('scenario exporter produces scenarios from exploration', async ({ page }) => {
    await page.goto(TEST_PAGE, { waitUntil: 'load' });

    const config = new ConcreteExplorationConfig({
      rootSelector: '#main-container',
      boundary: 'strict',
      strategy: 'bfs',
      maxDepth: 1,
      maxStates: 10,
      maxActionsPerState: 3,
      timeout: 10_000,
      stabilizationTimeout: 200,
    });

    const testContext = new ConcreteTestContext();
    testContext.page = page;

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

    await explorer.explore();

    const exporter = new ConcreteScenarioExporter(graph);

    // JSON export
    const json = exporter.exportJSON();
    expect(json.states.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(json)).toBeTruthy();

    // Mermaid export
    const mermaid = exporter.exportMermaid();
    expect(mermaid).toContain('stateDiagram-v2');

    // DOT export
    const dot = exporter.exportDOT();
    expect(dot).toContain('digraph {');

    // Scenarios
    const scenarios = exporter.exportScenarios();
    if (json.transitions.length > 0) {
      expect(scenarios.length).toBeGreaterThanOrEqual(1);
      for (const scenario of scenarios) {
        expect(scenario.name).toBeTruthy();
        expect(scenario.steps.length).toBeGreaterThan(0);
        expect(scenario.selectors.length).toBeGreaterThan(0);
      }
    }
  });
});
