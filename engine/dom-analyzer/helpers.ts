/**
 * buildKey — derives a stable, human-readable key for a DOM element.
 * Serializable: runs inside page.evaluate() via DomAnalyzer.
 */
export function buildKey(el: Element, index: number): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.replace(/\s+/g, '-').toLowerCase();
  const id = el.getAttribute('id');
  if (id) return id;
  const name = el.getAttribute('name');
  if (name) return name;
  const text = el.textContent?.trim();
  if (text && text.length < 40) return text.replace(/\s+/g, '-').toLowerCase();
  return `element-${index}`;
}

/**
 * buildSelector — returns the most specific generic CSS selector for a DOM element.
 * Priority: id > data-testid > aria-label > name > nth-of-type within parent.
 * Serializable: runs inside page.evaluate() via DomAnalyzer.
 * Library-specific selector strategies belong in each InferenceRule's produce().
 */
export function buildSelector(el: Element): { selector: string; strategy: string } {
  const tag = el.tagName.toLowerCase();

  const id = el.getAttribute('id');
  if (id) return { selector: `#${id}`, strategy: 'id' };

  const testId = el.getAttribute('data-testid');
  if (testId) return { selector: `${tag}[data-testid="${testId}"]`, strategy: 'data-testid' };

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return { selector: `${tag}[aria-label="${ariaLabel}"]`, strategy: 'aria-label' };

  const name = el.getAttribute('name');
  if (name) return { selector: `${tag}[name="${name}"]`, strategy: 'name' };

  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.querySelectorAll(tag));
    const pos = siblings.indexOf(el) + 1;
    return { selector: `${tag}:nth-of-type(${pos})`, strategy: 'nth-of-type' };
  }

  return { selector: tag, strategy: 'tagName' };
}
