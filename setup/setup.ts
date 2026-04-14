import { register, registerSingleton } from '../engine';
import {
  ActionExecutor,
  ConcreteActionExecutor,
  ConcreteDOMExtractor,
  ConcreteExplorationConfig,
  ConcreteExplorationGraph,
  ConcreteExplorationScope,
  ConcreteExplorer,
  ConcreteRulesEngine,
  ConcreteStateManager,
  DOMExtractor,
  ExplorationConfig,
  ExplorationGraph,
  ExplorationScope,
  Explorer,
  RulesEngine,
  StateManager,
} from '../explorer';
import { AngularMaterialPOM } from '../POM';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) {
    return;
  }
  register(AngularMaterialPOM);

  // Explorer — DI registrations
  registerSingleton(ExplorationConfig, ConcreteExplorationConfig);
  register(ExplorationScope, ConcreteExplorationScope);
  register(DOMExtractor, ConcreteDOMExtractor);
  registerSingleton(RulesEngine, ConcreteRulesEngine);
  register(ActionExecutor, ConcreteActionExecutor);
  registerSingleton(StateManager, ConcreteStateManager);
  registerSingleton(ExplorationGraph, ConcreteExplorationGraph);
  register(Explorer, ConcreteExplorer);

  isAlreadySetup = true;
}
