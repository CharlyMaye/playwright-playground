import { ElementFact } from './types';

/**
 * Port: extracts the interactive elements of the current UI state as
 * normalized {@link ElementFact}s.
 *
 * Each backend owns the full extraction strategy (in-browser JS evaluation
 * for Playwright/Puppeteer, UI Automation tree walking for WPF…) — the core
 * only ever sees facts.
 */
export abstract class DOMExtractor {
  abstract extract(): Promise<ElementFact[]>;
}
