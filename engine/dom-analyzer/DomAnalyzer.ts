import { Injector } from '../injector.decorator';
import { TestContext } from '../test.context';
import { INFERENCE_RULES } from './inference-rules';
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
    // Serialize rules as strings so they can cross the Node.js → browser boundary
    const serializedRules = INFERENCE_RULES.map((rule) => ({
      match: rule.match.toString(),
      produce: rule.produce.toString(),
    }));

    const elements = await this.testContext.page.evaluate(
      ({ rules, scopeSelector }) => {
        type SerializedRule = { match: string; produce: string };

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

            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const produceFn = new Function('el', 'index', `return (${raw.produce})(el, index)`) as (
              el: Element,
              index: number
            ) => object;

            const model = produceFn(el, globalIndex);
            const key = (model as { key?: string }).key ?? `element-${globalIndex}`;

            // Deduplicate by key — first rule wins (highest priority = first in array)
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              results.push(model);
            }
            break; // first matching rule wins per element
          }
        });

        return results;
      },
      { rules: serializedRules, scopeSelector: scope ?? null }
    );

    return elements as ElementModel[];
  }
}
