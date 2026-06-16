import { Locator } from '@playwright/test';
import { Injector } from '../../../engine';
import { DOMExtractor } from '../../DOMExtractor';
import { ExplorationConfig } from '../../ExplorationConfig';
import { ElementFact } from '../../types';
import { ExplorationScope } from './ExplorationScope';

const INTERACTIVE_SELECTOR = ['a', 'button', 'input', 'select', 'textarea', '[role]', '[tabindex]', '[contenteditable]', 'details', 'summary', '[aria-expanded]', '[aria-controls]', '[aria-haspopup]'].join(', ');

type CollectedProps = {
  tag: string;
  role: string | null;
  text: string;
  inputType: string | null;
  options: string[] | null;
  ariaExpanded: string | null;
  ariaControls: string | null;
  ariaOwns: string | null;
  tabindex: string | null;
  contentEditable: boolean;
  dataTestId: string | null;
  id: string;
  accessibleName: string | null;
  disabled: boolean;
  focusable: boolean;
  cssSelector: string;
  visible: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  /** `true` if the element matches (or descends from) one of the configured `ignoreSelectors`. */
  ignored: boolean;
};

/**
 * Runs IN THE BROWSER via `locator.evaluateAll` — must stay self-contained
 * (no closure over module scope, Playwright serializes its source). The
 * `ignoreSelectors` list is passed as a serialized argument, not captured.
 *
 * Batched on purpose: one protocol round-trip for the whole page instead of
 * three per element (`isVisible` + `evaluate` + `boundingBox`) — on heavy
 * pages (thousands of links) the per-element variant takes minutes.
 * `visible` mirrors Playwright's `isVisible` semantics: non-empty bounding
 * box and no `visibility: hidden`.
 *
 * `ignored` is computed here, against the real DOM, so `ignoreSelectors`
 * behaves as documented — genuine CSS selectors matched on the element or
 * any of its ancestors (`matches` / `closest`), not a uid/tag substring.
 */
function collectAllElementProps(nodes: (SVGElement | HTMLElement)[], ignoreSelectors: string[]): (CollectedProps | null)[] {
  const computeCssSelector = (target: HTMLElement): string => {
    const parts: string[] = [];
    let current: HTMLElement | null = target;
    while (current && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      if (current.dataset.testid) {
        parts.unshift(`[data-testid="${CSS.escape(current.dataset.testid)}"]`);
        break;
      }
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

  return nodes.map((node) => {
    try {
      const htmlEl = node as HTMLElement;
      const rect = htmlEl.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(htmlEl).visibility !== 'hidden';

      // Per-selector try/catch: an invalid selector must skip that rule, not abort the whole node.
      const ignored = ignoreSelectors.some((sel) => {
        try {
          return htmlEl.matches(sel) || htmlEl.closest(sel) !== null;
        } catch {
          return false;
        }
      });

      return {
        tag: htmlEl.tagName.toLowerCase(),
        role: htmlEl.getAttribute('role'),
        text: (htmlEl.textContent ?? '').trim().substring(0, 200),
        inputType: htmlEl.getAttribute('type'),
        options: htmlEl.tagName === 'SELECT' ? Array.from((htmlEl as HTMLSelectElement).options).map((o) => o.label) : null,
        ariaExpanded: htmlEl.getAttribute('aria-expanded'),
        ariaControls: htmlEl.getAttribute('aria-controls'),
        ariaOwns: htmlEl.getAttribute('aria-owns'),
        tabindex: htmlEl.getAttribute('tabindex'),
        contentEditable: htmlEl.isContentEditable,
        dataTestId: htmlEl.getAttribute('data-testid'),
        id: htmlEl.id,
        accessibleName: htmlEl.getAttribute('aria-label') ?? htmlEl.getAttribute('aria-labelledby') ?? (htmlEl as HTMLInputElement).labels?.[0]?.textContent?.trim() ?? htmlEl.getAttribute('title') ?? null,
        disabled: (htmlEl as HTMLButtonElement).disabled ?? false,
        focusable: htmlEl.tabIndex >= 0,
        cssSelector: computeCssSelector(htmlEl),
        visible,
        boundingBox: visible ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
        ignored,
      };
    } catch {
      return null;
    }
  });
}

@Injector({ Provide: [ExplorationScope, ExplorationConfig] })
export class PlaywrightDOMExtractor extends DOMExtractor {
  readonly #scope: ExplorationScope;
  readonly #config: ExplorationConfig;

  constructor(explorationScope: ExplorationScope, explorationConfig: ExplorationConfig) {
    super();
    this.#scope = explorationScope;
    this.#config = explorationConfig;
  }

  async extract(): Promise<ElementFact[]> {
    const facts: ElementFact[] = [];

    const rootElements = this.#scope.root.locator(INTERACTIVE_SELECTOR);
    facts.push(...(await this.#extractFromLocators(rootElements, true)));

    if (this.#scope.boundary === 'overflow') {
      const page = this.#scope.root.page();
      for (const selector of this.#scope.overflowSelectors) {
        const overflowElements = page.locator(selector).locator(INTERACTIVE_SELECTOR);
        facts.push(...(await this.#extractFromLocators(overflowElements, false)));
      }
    }

    return this.#applyFilters(facts);
  }

  async #extractFromLocators(locators: Locator, isInScope: boolean): Promise<ElementFact[]> {
    const allProps = await locators.evaluateAll(collectAllElementProps, this.#config.ignoreSelectors).catch(() => [] as (CollectedProps | null)[]);
    const facts: ElementFact[] = [];

    for (let i = 0; i < allProps.length; i++) {
      const props = allProps[i];
      // Skip unreadable nodes and elements excluded by `ignoreSelectors`.
      if (!props || props.ignored) continue;
      const uid = this.#generateUid(props.dataTestId, props.id, props.role, props.accessibleName, props.tag, i);

      facts.push({
        uid,
        tag: props.tag,
        role: props.role,
        accessibleName: props.accessibleName,
        visible: props.visible,
        enabled: !props.disabled,
        focusable: props.focusable,
        text: props.text,
        inputType: props.inputType,
        ...(props.options !== null && { options: props.options }),
        ariaExpanded: props.ariaExpanded === null ? null : props.ariaExpanded === 'true',
        ariaControls: props.ariaControls,
        ariaOwns: props.ariaOwns,
        tabindex: props.tabindex === null ? null : parseInt(props.tabindex, 10),
        contentEditable: props.contentEditable,
        boundingBox: props.boundingBox,
        isInScope,
        parentUid: null,
        nativeSelector: props.cssSelector,
      });
    }

    return facts;
  }

  #generateUid(dataTestId: string | null, id: string | null, role: string | null, accessibleName: string | null, tag: string, index: number): string {
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

    // `ignoreSelectors` is applied in-browser by `collectAllElementProps`
    // (real CSS matching), so it is already excluded by the time we get here.

    // Deduplicate repeated elements if configured
    if (this.#config.ignoreRepeatedElements) {
      filtered = this.#deduplicateRepeated(filtered);
    }

    return filtered;
  }

  #deduplicateRepeated(facts: ElementFact[]): ElementFact[] {
    const seen = new Map<string, ElementFact>();
    for (const fact of facts) {
      const structureKey = `${fact.tag}|${fact.role}|${fact.inputType}|${fact.enabled}|${fact.visible}|${fact.accessibleName}|${fact.text.substring(0, 50)}`;
      if (!seen.has(structureKey)) {
        seen.set(structureKey, fact);
      }
    }
    return [...seen.values()];
  }
}
