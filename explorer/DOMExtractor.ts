import { Locator } from '@playwright/test';
import { Injector } from '../engine';
import { ExplorationConfig } from './ExplorationConfig';
import { ExplorationScope } from './ExplorationScope';
import { ElementFact } from './types';

const INTERACTIVE_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role]',
  '[tabindex]',
  '[contenteditable]',
  'details',
  'summary',
  '[aria-expanded]',
  '[aria-controls]',
  '[aria-haspopup]',
].join(', ');

export abstract class DOMExtractor {
  abstract extract(): Promise<ElementFact[]>;
}

@Injector({ Provide: [ExplorationScope, ExplorationConfig] })
export class ConcreteDOMExtractor extends DOMExtractor {
  readonly #scope: ExplorationScope;
  readonly #config: ExplorationConfig;

  constructor(
    protected explorationScope: ExplorationScope,
    protected explorationConfig: ExplorationConfig
  ) {
    super();
    this.#scope = explorationScope;
    this.#config = explorationConfig;
  }

  async extract(): Promise<ElementFact[]> {
    const facts: ElementFact[] = [];

    // Extract from root scope
    const rootElements = this.#scope.root.locator(INTERACTIVE_SELECTOR);
    const rootFacts = await this.#extractFromLocators(rootElements, true);
    facts.push(...rootFacts);

    // If overflow mode, also extract from overflow selectors
    if (this.#scope.boundary === 'overflow') {
      const page = this.#scope.root.page();
      for (const selector of this.#scope.overflowSelectors) {
        const overflowElements = page.locator(selector).locator(INTERACTIVE_SELECTOR);
        const overflowFacts = await this.#extractFromLocators(overflowElements, false);
        // Mark overflow elements with isInScope based on aria-controls linkage
        facts.push(...overflowFacts);
      }
    }

    // Filter ignored selectors
    return this.#applyFilters(facts);
  }

  async #extractFromLocators(locators: Locator, isInScope: boolean): Promise<ElementFact[]> {
    const count = await locators.count();
    const facts: ElementFact[] = [];

    for (let i = 0; i < count; i++) {
      const el = locators.nth(i);
      const fact = await this.#extractSingleElement(el, i, isInScope);
      if (fact) facts.push(fact);
    }

    return facts;
  }

  async #extractSingleElement(el: Locator, index: number, isInScope: boolean): Promise<ElementFact | null> {
    try {
      const visible = await el.isVisible().catch(() => false);

      const props = await el.evaluate((node) => {
        const htmlEl = node as HTMLElement;

        const computeCssSelector = (target: HTMLElement): string => {
          const parts: string[] = [];
          let current: HTMLElement | null = target;
          while (current && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();
            if (current.id) {
              parts.unshift(`#${CSS.escape(current.id)}`);
              break;
            }
            const parent: HTMLElement | null = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName);
              if (siblings.length > 1) {
                const idx = siblings.indexOf(current) + 1;
                selector += `:nth-of-type(${idx})`;
              }
            }
            parts.unshift(selector);
            current = parent;
          }
          return parts.join(' > ');
        };

        return {
          tag: htmlEl.tagName.toLowerCase(),
          role: htmlEl.getAttribute('role'),
          text: (htmlEl.textContent ?? '').trim().substring(0, 200),
          inputType: htmlEl.getAttribute('type'),
          ariaExpanded: htmlEl.getAttribute('aria-expanded'),
          ariaControls: htmlEl.getAttribute('aria-controls'),
          ariaOwns: htmlEl.getAttribute('aria-owns'),
          tabindex: htmlEl.getAttribute('tabindex'),
          contentEditable: htmlEl.isContentEditable,
          dataTestId: htmlEl.getAttribute('data-testid'),
          id: htmlEl.id,
          accessibleName:
            htmlEl.getAttribute('aria-label') ??
            htmlEl.getAttribute('aria-labelledby') ??
            (htmlEl as HTMLInputElement).labels?.[0]?.textContent?.trim() ??
            htmlEl.getAttribute('title') ??
            null,
          disabled: (htmlEl as HTMLButtonElement).disabled ?? false,
          focusable: htmlEl.tabIndex >= 0,
          cssSelector: computeCssSelector(htmlEl),
        };
      });

      const boundingBox = await el.boundingBox().catch(() => null);
      const uid = this.#generateUid(props.dataTestId, props.id, props.role, props.accessibleName, props.tag, index);

      return {
        uid,
        tag: props.tag,
        role: props.role,
        accessibleName: props.accessibleName,
        visible,
        enabled: !props.disabled,
        focusable: props.focusable,
        text: props.text,
        inputType: props.inputType,
        ariaExpanded: props.ariaExpanded === null ? null : props.ariaExpanded === 'true',
        ariaControls: props.ariaControls,
        ariaOwns: props.ariaOwns,
        tabindex: props.tabindex === null ? null : parseInt(props.tabindex, 10),
        contentEditable: props.contentEditable,
        boundingBox,
        isInScope,
        parentUid: null,
        cssSelector: props.cssSelector,
      };
    } catch {
      return null;
    }
  }

  #generateUid(
    dataTestId: string | null,
    id: string | null,
    role: string | null,
    accessibleName: string | null,
    tag: string,
    index: number
  ): string {
    // Priority 1: data-testid
    if (dataTestId) return `testid:${dataTestId}`;
    // Priority 2: id if present
    if (id) return `#${id}`;
    // Priority 3: role + accessible name
    if (role && accessibleName) return `${role}:"${accessibleName}"`;
    if (role) return `${role}[${index}]`;
    // Priority 4: tag + index
    return `${tag}[${index}]`;
  }

  #applyFilters(facts: ElementFact[]): ElementFact[] {
    let filtered = facts;

    // Filter by ignoreSelectors — we match on uid/tag patterns
    if (this.#config.ignoreSelectors.length > 0) {
      filtered = filtered.filter((fact) => {
        return !this.#config.ignoreSelectors.some((sel) => fact.uid.includes(sel) || fact.tag === sel);
      });
    }

    // Deduplicate repeated elements if configured
    if (this.#config.ignoreRepeatedElements) {
      filtered = this.#deduplicateRepeated(filtered);
    }

    return filtered;
  }

  #deduplicateRepeated(facts: ElementFact[]): ElementFact[] {
    const seen = new Map<string, ElementFact>();
    for (const fact of facts) {
      // Structure key: tag + role + inputType + enabled + visible
      const structureKey = `${fact.tag}|${fact.role}|${fact.inputType}|${fact.enabled}|${fact.visible}`;
      if (!seen.has(structureKey)) {
        seen.set(structureKey, fact);
      }
    }
    return [...seen.values()];
  }
}
