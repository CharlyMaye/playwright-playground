import { Injector } from '../injector.decorator';
import { TestContext } from '../test.context';
import { getInferenceHelpers, getInferenceRules } from './inference-rule-registry';
import type { ElementModel } from './interaction-model';

export abstract class DomAnalyzer {
  abstract analyze(scope?: string): Promise<ElementModel[]>;
}

@Injector({ Provide: [TestContext] })
export class ConcreteDomAnalyzer extends DomAnalyzer {
  constructor(private testContext: TestContext) {
    super();
  }

  async analyze(scope?: string): Promise<ElementModel[]> {
    const rules = getInferenceRules();
    const helpers = getInferenceHelpers();

    const serializedRules = rules.map((rule) => ({
      name: rule.name,
      match: rule.match.toString(),
      produce: rule.produce.toString(),
    }));

    // Serialize helpers so they are available inside the browser context
    const serializedHelpers = {
      buildKey: helpers.buildKey.toString(),
      buildSelector: helpers.buildSelector.toString(),
    };

    const elements = await this.testContext.page.evaluate(
      ({ rules, scopeSelector, helpers }) => {
        type SerializedRule = { name: string; match: string; produce: string };

        // Reconstruct helpers in the browser context
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const buildKeyFn = new Function('el', 'index', `return (${helpers.buildKey})(el, index)`) as (
          el: Element,
          index: number
        ) => string;
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const buildSelectorFn = new Function('el', `return (${helpers.buildSelector})(el)`) as (el: Element) => {
          selector: string;
          strategy: string;
        };

        const container: Element = scopeSelector
          ? (document.querySelector(scopeSelector) ?? document.body)
          : document.body;

        const allElements = Array.from(container.querySelectorAll('*'));
        const results: object[] = [];
        const seenKeys = new Set<string>();

        allElements.forEach((el, globalIndex) => {
          for (const raw of rules as SerializedRule[]) {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const matchFn = new Function('el', `return (${raw.match})(el)`) as (el: Element) => boolean;
            if (!matchFn(el)) continue;

            // Wrap produce with helpers injected into its scope
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const produceFn = new Function(
              'el',
              'index',
              'buildKey',
              'buildSelector',
              `return (${raw.produce})(el, index)`
            ) as (el: Element, index: number, bk: typeof buildKeyFn, bs: typeof buildSelectorFn) => object;

            const model = produceFn(el, globalIndex, buildKeyFn, buildSelectorFn);
            const key = (model as { key?: string }).key ?? `element-${globalIndex}`;

            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              // Inject traceability fields: matchedRule and selectorStrategy come from the model
              // (rules set them via buildSelector which returns { selector, strategy })
              results.push({ ...model, matchedRule: raw.name });
            }
            break;
          }
        });

        return results;
      },
      { rules: serializedRules, scopeSelector: scope ?? null, helpers: serializedHelpers }
    );

    return elements as ElementModel[];
  }
}
