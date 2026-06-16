// ── Core (driver-agnostic) ──
export { ActionExecutor, computeDomChanges } from './ActionExecutor';
export { DOMExtractor } from './DOMExtractor';
export { ConcreteExplorationConfig, ExplorationConfig } from './ExplorationConfig';
export type { ExplorationConfigData, PartialExplorationConfig } from './ExplorationConfig';
export { ConcreteExplorationGraph, ExplorationGraph } from './ExplorationGraph';
export { CompositeExplorationObserver } from './CompositeExplorationObserver';
export { ConcreteExplorer, Explorer } from './Explorer';
export type { ExplorationSummary } from './Explorer';
export { graphToDOT, graphToMermaid, serializeGraph } from './GraphSerializer';
export type { FactsSerialization } from './GraphSerializer';
export { ExplorationObserver } from './ExplorationObserver';
export { FactEvictionObserver } from './FactEvictionObserver';
export { FifoFrontier, Frontier, LifoFrontier } from './Frontier';
export { NavigationDriver } from './NavigationDriver';
export { ReadinessChecker } from './ReadinessChecker';
export { ConcreteRulesEngine, DefaultRules, RulesEngine } from './RulesEngine';
export { ConcreteScenarioExporter, ScenarioExporter } from './ScenarioExporter';
export type { Scenario } from './ScenarioExporter';
export { ScreenshotObserver } from './ScreenshotObserver';
export { StabilizationChecker } from './StabilizationChecker';
export { StateRestorer } from './StateRestorer';
export type { RestoreToken } from './StateRestorer';
export { ConcreteStateManager, StateManager } from './StateManager';
export type { ActionResult, BoundingBox, CandidateAction, DomChanges, ElementFact, ExplorationTarget, SequenceAction, SequenceStep, SerializedGraph, StateNode, Transition, UnitaryAction, WaitCondition } from './types';

// ── Playwright adapter ──
export { DEFAULT_HTML_RULES, ExplorationScope, HtmlDefaultRules, PlaywrightActionExecutor, PlaywrightDOMExtractor, PlaywrightExplorationScope, PlaywrightNavigationDriver, PlaywrightReadinessChecker, PlaywrightStateRestorer, registerPlaywrightAdapter, resolveTargetLocator } from './adapters/playwright';
export { expect as explorerExpect, explorerTest, withExplorationScope } from './fixture';

import { registerScoped, registerSingleton } from '../engine';
import { registerPlaywrightAdapter } from './adapters/playwright';
import { CompositeExplorationObserver } from './CompositeExplorationObserver';
import { ConcreteExplorationConfig, ExplorationConfig } from './ExplorationConfig';
import { ConcreteExplorationGraph, ExplorationGraph } from './ExplorationGraph';
import { ConcreteExplorer, Explorer } from './Explorer';
import { ExplorationObserver } from './ExplorationObserver';
import { FactEvictionObserver } from './FactEvictionObserver';
import { ConcreteRulesEngine, RulesEngine } from './RulesEngine';
import { ScreenshotObserver } from './ScreenshotObserver';
import { ConcreteStateManager, StateManager } from './StateManager';

/** Registers the driver-agnostic exploration services (no port bindings). */
export function registerExplorerCore(): void {
  registerScoped(ExplorationConfig, ConcreteExplorationConfig);
  registerSingleton(RulesEngine, ConcreteRulesEngine);
  registerScoped(StateManager, ConcreteStateManager);
  registerScoped(ExplorationGraph, ConcreteExplorationGraph);
  registerScoped(ScreenshotObserver, ScreenshotObserver);
  registerScoped(FactEvictionObserver, FactEvictionObserver);
  registerScoped(ExplorationObserver, CompositeExplorationObserver);
  registerScoped(Explorer, ConcreteExplorer);
}

/** Full web setup: core + Playwright port bindings. */
export function registerExplorerDependencies(): void {
  registerExplorerCore();
  registerPlaywrightAdapter();
}
