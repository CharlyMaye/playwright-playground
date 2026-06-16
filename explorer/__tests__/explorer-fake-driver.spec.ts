import { expect, test } from '@playwright/test';
import type { RuleProperties } from 'json-rules-engine';
import { ActionExecutor } from '../ActionExecutor';
import { DOMExtractor } from '../DOMExtractor';
import { ConcreteExplorationConfig } from '../ExplorationConfig';
import { ConcreteExplorationGraph } from '../ExplorationGraph';
import { ConcreteExplorer } from '../Explorer';
import { CompositeExplorationObserver } from '../CompositeExplorationObserver';
import { FactEvictionObserver } from '../FactEvictionObserver';
import { ScreenshotObserver } from '../ScreenshotObserver';
import { NavigationDriver } from '../NavigationDriver';
import { ReadinessChecker } from '../ReadinessChecker';
import { ConcreteRulesEngine, DefaultRules } from '../RulesEngine';
import { StabilizationChecker } from '../StabilizationChecker';
import { ConcreteStateManager } from '../StateManager';
import { RestoreToken, StateRestorer } from '../StateRestorer';
import { ActionResult, CandidateAction, ElementFact, getTargetUid } from '../types';

/**
 * Architectural proof: the exploration core (Explorer loop, RulesEngine,
 * StateManager, ExplorationGraph) runs against a driver that is NOT
 * Playwright — a tiny in-memory screen machine implementing the ports.
 * If this passes, a WPF/Puppeteer backend only ever needs an adapter.
 */

function makeFact(uid: string): ElementFact {
  return {
    uid,
    tag: 'button',
    role: 'button',
    accessibleName: uid,
    visible: true,
    enabled: true,
    focusable: true,
    text: uid,
    inputType: null,
    ariaExpanded: null,
    ariaControls: null,
    ariaOwns: null,
    tabindex: null,
    contentEditable: false,
    boundingBox: null,
    isInScope: true,
    parentUid: null,
    nativeSelector: `fake://${uid}`,
  };
}

/** Fake UI: two internal screens + one external destination. */
const SCREENS: Record<string, ElementFact[]> = {
  home: [makeFact('testid:open'), makeFact('testid:ext')],
  panel: [makeFact('testid:close'), makeFact('testid:noop')],
};

/** Effect of clicking each element, regardless of the current screen. */
const CLICK_DESTINATIONS: Record<string, string> = {
  'testid:open': 'panel',
  'testid:ext': 'external',
  'testid:close': 'home',
  'testid:noop': 'panel',
};

type FakeApp = { screen: string };

class FakeDOMExtractor extends DOMExtractor {
  readonly #app: FakeApp;
  constructor(app: FakeApp) {
    super();
    this.#app = app;
  }
  extract(): Promise<ElementFact[]> {
    return Promise.resolve(SCREENS[this.#app.screen] ?? []);
  }
}

class FakeActionExecutor extends ActionExecutor {
  readonly #app: FakeApp;
  constructor(app: FakeApp) {
    super();
    this.#app = app;
  }
  /** Capability declaration under test: this fake backend has no hover. */
  supports(action: CandidateAction): boolean {
    return action.type === 'click';
  }
  execute(action: CandidateAction): Promise<ActionResult> {
    const destination = CLICK_DESTINATIONS[getTargetUid(action)];
    if (destination) this.#app.screen = destination;
    return Promise.resolve({ success: true, error: null, newFacts: [], domChanged: true, duration: 1 });
  }
}

class FakeNavigationDriver extends NavigationDriver {
  readonly #app: FakeApp;
  constructor(app: FakeApp) {
    super();
    this.#app = app;
  }
  currentLocation(): string {
    return this.#app.screen === 'external' ? 'https://external.example/page' : 'app://main';
  }
  async captureScreenshot(): Promise<void> {
    // no-op
  }
}

/** Restores the exact screen — richer than the URL-based web restorer. */
class FakeStateRestorer extends StateRestorer {
  readonly #app: FakeApp;
  constructor(app: FakeApp) {
    super();
    this.#app = app;
  }
  snapshotRestorePoint(): RestoreToken {
    return this.#app.screen;
  }
  restore(token: RestoreToken): Promise<void> {
    this.#app.screen = token;
    return Promise.resolve();
  }
  hasLeftRestorePoint(): boolean {
    return this.#app.screen === 'external';
  }
  isWithinApplication(): boolean {
    return this.#app.screen !== 'external';
  }
}

class FakeReadinessChecker extends ReadinessChecker {
  async waitForReady(): Promise<void> {
    // no-op
  }
}

class FakeStabilizationChecker extends StabilizationChecker {
  async waitUntilStable(): Promise<void> {
    // no-op — the fake driver mutates synchronously, nothing to settle.
  }
}

/** Emits click (supported) AND hover (unsupported) so the capability filter is exercised. */
const FAKE_RULES: RuleProperties[] = [
  {
    conditions: {
      all: [
        { fact: 'tag', operator: 'equal', value: 'button' },
        { fact: 'visible', operator: 'equal', value: true },
        { fact: 'enabled', operator: 'equal', value: true },
      ],
    },
    event: { type: 'click', params: { priority: 10 } },
  },
  {
    conditions: {
      all: [{ fact: 'tag', operator: 'equal', value: 'button' }],
    },
    event: { type: 'hover', params: { priority: 5 } },
  },
];

class FakeDefaultRules extends DefaultRules {
  get rules(): RuleProperties[] {
    return FAKE_RULES;
  }
}

function buildExplorer(app: FakeApp, strategy: 'bfs' | 'dfs') {
  const config = new ConcreteExplorationConfig({
    strategy,
    maxDepth: 3,
    maxStates: 10,
    maxActionsPerState: 10,
    timeout: 10_000,
    stabilizationTimeout: 0,
  });
  const navigation = new FakeNavigationDriver(app);
  return new ConcreteExplorer(
    new FakeDOMExtractor(app),
    new ConcreteRulesEngine(config, new FakeDefaultRules()),
    new FakeActionExecutor(app),
    new ConcreteStateManager(config),
    new ConcreteExplorationGraph(),
    config,
    new FakeReadinessChecker(),
    navigation,
    new FakeStateRestorer(app),
    new FakeStabilizationChecker(),
    new CompositeExplorationObserver(new ScreenshotObserver(navigation, config), new FactEvictionObserver(config))
  );
}

/**
 * Multi-page fake: every click NAVIGATES (location change), like a static
 * site. Exercises the followNavigation switch: 'none' treats every link as
 * a boundary; 'same-application' crawls in-app pages as states.
 */
const PAGES: Record<string, ElementFact[]> = {
  'app://home': [makeFact('testid:to-about'), makeFact('testid:to-ext')],
  'app://about': [makeFact('testid:to-deep')],
  'app://deep': [makeFact('testid:to-home')],
};

const LINK_DESTINATIONS: Record<string, string> = {
  'testid:to-about': 'app://about',
  'testid:to-deep': 'app://deep',
  'testid:to-home': 'app://home',
  'testid:to-ext': 'https://external.example/page',
};

type FakeSite = { location: string };

class FakeSiteExtractor extends DOMExtractor {
  readonly #site: FakeSite;
  constructor(site: FakeSite) {
    super();
    this.#site = site;
  }
  extract(): Promise<ElementFact[]> {
    return Promise.resolve(PAGES[this.#site.location] ?? []);
  }
}

class FakeSiteExecutor extends ActionExecutor {
  readonly #site: FakeSite;
  constructor(site: FakeSite) {
    super();
    this.#site = site;
  }
  supports(action: CandidateAction): boolean {
    return action.type === 'click';
  }
  execute(action: CandidateAction): Promise<ActionResult> {
    const destination = LINK_DESTINATIONS[getTargetUid(action)];
    if (destination) this.#site.location = destination;
    return Promise.resolve({ success: true, error: null, newFacts: [], domChanged: true, duration: 1 });
  }
}

class FakeSiteNavigationDriver extends NavigationDriver {
  readonly #site: FakeSite;
  constructor(site: FakeSite) {
    super();
    this.#site = site;
  }
  currentLocation(): string {
    return this.#site.location;
  }
  async captureScreenshot(): Promise<void> {
    // no-op
  }
}

class FakeSiteRestorer extends StateRestorer {
  readonly #site: FakeSite;
  constructor(site: FakeSite) {
    super();
    this.#site = site;
  }
  snapshotRestorePoint(): RestoreToken {
    return this.#site.location;
  }
  restore(token: RestoreToken): Promise<void> {
    this.#site.location = token;
    return Promise.resolve();
  }
  hasLeftRestorePoint(token: RestoreToken): boolean {
    return this.#site.location !== token;
  }
  isWithinApplication(): boolean {
    return this.#site.location.startsWith('app://');
  }
}

function buildSiteExplorer(site: FakeSite, followNavigation: 'none' | 'same-application', maxDepth = 3) {
  const config = new ConcreteExplorationConfig({
    strategy: 'bfs',
    maxDepth,
    maxStates: 10,
    maxActionsPerState: 10,
    timeout: 10_000,
    stabilizationTimeout: 0,
    followNavigation,
  });
  const navigation = new FakeSiteNavigationDriver(site);
  return new ConcreteExplorer(
    new FakeSiteExtractor(site),
    new ConcreteRulesEngine(config, new FakeDefaultRules()),
    new FakeSiteExecutor(site),
    new ConcreteStateManager(config),
    new ConcreteExplorationGraph(),
    config,
    new FakeReadinessChecker(),
    navigation,
    new FakeSiteRestorer(site),
    new FakeStabilizationChecker(),
    new CompositeExplorationObserver(new ScreenshotObserver(navigation, config), new FactEvictionObserver(config))
  );
}

test.describe('Explorer — followNavigation on an in-memory multi-page fake (no browser)', () => {
  test("'none' (SPA mode): every navigation is a boundary, exploration stays at depth 0", async () => {
    const site: FakeSite = { location: 'app://home' };
    const explorer = buildSiteExplorer(site, 'none');

    const graph = await explorer.explore();

    // Only the home page is ever a state; both links are external boundaries.
    expect(graph.getAllStates()).toHaveLength(1);
    const transitions = graph.getTransitions();
    expect(transitions.filter((t) => t.to === '__external_navigation__')).toHaveLength(2);
    expect(explorer.getSummary().maxDepthReached).toBe(0);
  });

  test("'same-application' (crawler mode): in-app pages become states, foreign stays a boundary", async () => {
    const site: FakeSite = { location: 'app://home' };
    const explorer = buildSiteExplorer(site, 'same-application');

    const graph = await explorer.explore();

    // home (0) → about (1) → deep (2) discovered; external.example stays a boundary.
    const states = graph.getAllStates();
    expect(states).toHaveLength(3);
    expect(states.map((s) => s.location).sort()).toEqual(['app://about', 'app://deep', 'app://home']);

    const transitions = graph.getTransitions();
    const external = transitions.filter((t) => t.to === '__external_navigation__');
    expect(external).toHaveLength(1);
    expect(external[0].navigationUrl).toBe('https://external.example/page');

    // In-app navigation transitions carry the destination location.
    const inApp = transitions.filter((t) => t.to !== '__external_navigation__' && !t.selfLoop);
    expect(inApp.every((t) => t.navigationUrl?.startsWith('app://'))).toBe(true);

    expect(explorer.getSummary().maxDepthReached).toBe(2);
    // deep → home closes a cycle back to the initial state.
    expect(graph.getCycles().length).toBeGreaterThanOrEqual(1);
  });

  test("'same-application': maxDepth still bounds the crawl", async () => {
    const site: FakeSite = { location: 'app://home' };
    const explorer = buildSiteExplorer(site, 'same-application', 1);

    const graph = await explorer.explore();

    // about (depth 1) is discovered but not expanded → deep is never reached.
    expect(graph.getAllStates().map((s) => s.location).sort()).toEqual(['app://about', 'app://home']);
    expect(explorer.getSummary().maxDepthReached).toBe(1);
  });
});

test.describe('Explorer — core loop on an in-memory fake driver (no browser)', () => {
  test('explores the fake UI: discovery, cycle, self-loop, external navigation', async () => {
    const app: FakeApp = { screen: 'home' };
    const explorer = buildExplorer(app, 'bfs');

    const graph = await explorer.explore();

    // 2 internal screens discovered, none failed
    expect(graph.getAllStates()).toHaveLength(2);
    const summary = explorer.getSummary();
    expect(summary.statesDiscovered).toBe(2);
    expect(summary.failedActions).toBe(0);

    // 4 click transitions: home→panel, home→external, panel→home, panel↺
    const transitions = graph.getTransitions();
    expect(transitions).toHaveLength(4);

    const external = transitions.filter((t) => t.to === '__external_navigation__');
    expect(external).toHaveLength(1);
    expect(external[0].navigationUrl).toBe('https://external.example/page');

    expect(transitions.filter((t) => t.selfLoop)).toHaveLength(1);

    // home→panel→home is a cycle
    expect(graph.getCycles().length).toBeGreaterThanOrEqual(1);
  });

  test('unsupported actions are filtered out by the capability declaration', async () => {
    const app: FakeApp = { screen: 'home' };
    const explorer = buildExplorer(app, 'bfs');

    const graph = await explorer.explore();

    const actionTypes = graph.getTransitions().map((t) => t.action.type);
    expect(actionTypes).not.toContain('hover');
    expect(explorer.getSummary().failedActions).toBe(0);
  });

  test('DFS strategy reaches the same graph on this UI', async () => {
    const app: FakeApp = { screen: 'home' };
    const explorer = buildExplorer(app, 'dfs');

    const graph = await explorer.explore();

    expect(graph.getAllStates()).toHaveLength(2);
    expect(graph.getTransitions()).toHaveLength(4);
  });
});
