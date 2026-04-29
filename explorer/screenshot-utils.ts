import type { Page } from '@playwright/test';

export type ClipRegion = { x: number; y: number; width: number; height: number };

/**
 * Compute the clip rectangle for a scoped screenshot.
 *
 * 1. Gets the bounding box of `rootSelector`.
 * 2. Optionally unions it with each visible overflow container.
 * 3. Applies `margin` px padding, clamped to the viewport.
 *
 * Returns `null` when the root element is not found or not visible
 * (caller should fall back to a full-viewport capture).
 */
export async function computeClipRegion(page: Page, rootSelector: string, overflowSelectors: string[], margin: number, includeOverflows: boolean): Promise<ClipRegion | null> {
  const rootBox = await page
    .locator(rootSelector)
    .boundingBox()
    .catch(() => null);
  if (!rootBox) return null;

  let minX = rootBox.x;
  let minY = rootBox.y;
  let maxX = rootBox.x + rootBox.width;
  let maxY = rootBox.y + rootBox.height;

  if (includeOverflows) {
    for (const selector of overflowSelectors) {
      const overlay = page.locator(selector);
      const visible = await overlay.isVisible().catch(() => false);
      if (!visible) continue;

      const overlayBox = await overlay.boundingBox().catch(() => null);
      if (!overlayBox || (overlayBox.width === 0 && overlayBox.height === 0)) continue;

      minX = Math.min(minX, overlayBox.x);
      minY = Math.min(minY, overlayBox.y);
      maxX = Math.max(maxX, overlayBox.x + overlayBox.width);
      maxY = Math.max(maxY, overlayBox.y + overlayBox.height);
    }
  }

  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };

  const x = Math.max(0, minX - margin);
  const y = Math.max(0, minY - margin);
  const right = Math.min(viewport.width, maxX + margin);
  const bottom = Math.min(viewport.height, maxY + margin);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(right - x),
    height: Math.round(bottom - y),
  };
}
