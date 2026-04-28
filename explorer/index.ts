export { ActionExecutor, computeDomChanges, ConcreteActionExecutor } from './ActionExecutor';
export { DEFAULT_HTML_RULES } from './default-rules';
export { ConcreteDOMExtractor, DOMExtractor } from './DOMExtractor';
export { ConcreteExplorationConfig, ExplorationConfig } from './ExplorationConfig';
export type { ExplorationConfigData, PartialExplorationConfig } from './ExplorationConfig';
export { ConcreteExplorationGraph, ExplorationGraph } from './ExplorationGraph';
export { ConcreteExplorationScope, ExplorationScope } from './ExplorationScope';
export { ConcreteExplorer, Explorer } from './Explorer';
export type { ExplorationSummary } from './Explorer';
export { expect as explorerExpect, explorerTest, withExplorationScope } from './fixture';
export { ConcreteReadinessChecker, ReadinessChecker } from './ReadinessChecker';
export { ConcreteRulesEngine, RulesEngine } from './RulesEngine';
export { ConcreteScenarioExporter, ScenarioExporter } from './ScenarioExporter';
export type { Scenario } from './ScenarioExporter';
export { ConcreteStateManager, StateManager } from './StateManager';

import { registerScoped, registerSingleton } from '../engine';
import { ActionExecutor, ConcreteActionExecutor } from './ActionExecutor';
import { ConcreteDOMExtractor, DOMExtractor } from './DOMExtractor';
import { ConcreteExplorationConfig, ExplorationConfig } from './ExplorationConfig';
import { ConcreteExplorationGraph, ExplorationGraph } from './ExplorationGraph';
import { ConcreteExplorationScope, ExplorationScope } from './ExplorationScope';
import { ConcreteExplorer, Explorer } from './Explorer';
import { ConcreteReadinessChecker, ReadinessChecker } from './ReadinessChecker';
import { ConcreteRulesEngine, RulesEngine } from './RulesEngine';
import { ConcreteStateManager, StateManager } from './StateManager';

export function registerExplorerDependencies(): void {
  registerScoped(ExplorationConfig, ConcreteExplorationConfig);
  registerScoped(ExplorationScope, ConcreteExplorationScope);
  registerScoped(DOMExtractor, ConcreteDOMExtractor);
  registerSingleton(RulesEngine, ConcreteRulesEngine);
  registerScoped(ReadinessChecker, ConcreteReadinessChecker);
  registerScoped(ActionExecutor, ConcreteActionExecutor);
  registerScoped(StateManager, ConcreteStateManager);
  registerScoped(ExplorationGraph, ConcreteExplorationGraph);
  registerScoped(Explorer, ConcreteExplorer);
}

export type { ActionResult, BoundingBox, CandidateAction, DomChanges, ElementFact, ExplorationTarget, SequenceAction, SequenceStep, SerializedGraph, StateNode, Transition, UnitaryAction, WaitCondition } from './types';
