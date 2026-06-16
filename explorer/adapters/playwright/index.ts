import { registerScoped, registerSingleton } from '../../../engine';
import { ActionExecutor } from '../../ActionExecutor';
import { DOMExtractor } from '../../DOMExtractor';
import { NavigationDriver } from '../../NavigationDriver';
import { ReadinessChecker } from '../../ReadinessChecker';
import { DefaultRules } from '../../RulesEngine';
import { StabilizationChecker } from '../../StabilizationChecker';
import { StateRestorer } from '../../StateRestorer';
import { ExplorationScope, PlaywrightExplorationScope } from './ExplorationScope';
import { HtmlDefaultRules } from './html-default-rules';
import { PlaywrightActionExecutor } from './PlaywrightActionExecutor';
import { PlaywrightDOMExtractor } from './PlaywrightDOMExtractor';
import { PlaywrightNavigationDriver } from './PlaywrightNavigationDriver';
import { PlaywrightReadinessChecker } from './PlaywrightReadinessChecker';
import { PlaywrightStabilizationChecker } from './PlaywrightStabilizationChecker';
import { PlaywrightStateRestorer } from './PlaywrightStateRestorer';

export { ExplorationScope, PlaywrightExplorationScope } from './ExplorationScope';
export { DEFAULT_HTML_RULES, HtmlDefaultRules } from './html-default-rules';
export { resolveTargetLocator } from './locator-resolver';
export { PlaywrightActionExecutor } from './PlaywrightActionExecutor';
export { PlaywrightDOMExtractor } from './PlaywrightDOMExtractor';
export { PlaywrightNavigationDriver } from './PlaywrightNavigationDriver';
export { PlaywrightReadinessChecker } from './PlaywrightReadinessChecker';
export { PlaywrightStabilizationChecker } from './PlaywrightStabilizationChecker';
export { PlaywrightStateRestorer } from './PlaywrightStateRestorer';

/**
 * Binds every core port to its Playwright implementation.
 * An alternative backend (Puppeteer, WPF…) provides its own `registerXxxAdapter`.
 */
export function registerPlaywrightAdapter(): void {
  registerScoped(ExplorationScope, PlaywrightExplorationScope);
  registerScoped(DOMExtractor, PlaywrightDOMExtractor);
  registerScoped(ReadinessChecker, PlaywrightReadinessChecker);
  registerScoped(StabilizationChecker, PlaywrightStabilizationChecker);
  registerScoped(ActionExecutor, PlaywrightActionExecutor);
  registerScoped(NavigationDriver, PlaywrightNavigationDriver);
  registerScoped(StateRestorer, PlaywrightStateRestorer);
  registerSingleton(DefaultRules, HtmlDefaultRules);
}
