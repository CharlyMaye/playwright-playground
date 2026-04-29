import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { computeClipRegion } from '../screenshot-utils';

// ---------------------------------------------------------------------------
// Helpers — lightweight Page mock with just the methods computeClipRegion uses
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; width: number; height: number };

function createMockPage(rootBox: Box | null, overlays: Map<string, { visible: boolean; box: Box | null }> = new Map(), viewport = { width: 1280, height: 720 }) {
  return {
    locator(selector: string) {
      // Root selector
      const overlay = overlays.get(selector);
      if (overlay) {
        return {
          boundingBox: () => Promise.resolve(overlay.box),
          isVisible: () => Promise.resolve(overlay.visible),
        };
      }
      return {
        boundingBox: () => Promise.resolve(rootBox),
        isVisible: () => Promise.resolve(rootBox !== null),
      };
    },
    viewportSize: () => viewport,
  } as unknown as Page;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('computeClipRegion', () => {
  test('returns null when root element is not found', async () => {
    const page = createMockPage(null);
    const result = await computeClipRegion(page, '.missing', [], 0, false);
    expect(result).toBeNull();
  });

  test('clips to root bounding box without margin', async () => {
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 });
    const result = await computeClipRegion(page, '.root', [], 0, false);
    expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });

  test('applies margin around root', async () => {
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 });
    const result = await computeClipRegion(page, '.root', [], 10, false);
    expect(result).toEqual({ x: 90, y: 40, width: 220, height: 120 });
  });

  test('clamps margin to viewport edges', async () => {
    const page = createMockPage({ x: 5, y: 3, width: 200, height: 100 }, new Map(), { width: 300, height: 200 });
    const result = await computeClipRegion(page, '.root', [], 20, false);
    // x clamped to 0 (5-20=-15 → 0), y clamped to 0 (3-20=-17 → 0)
    // right clamped to 300 (5+200+20=225, ok), bottom clamped to 200 (3+100+20=123, ok)
    expect(result).toEqual({ x: 0, y: 0, width: 225, height: 123 });
  });

  test('unions root with visible overlay', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([['.cdk-overlay-container', { visible: true, box: { x: 80, y: 200, width: 300, height: 150 } }]]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays);
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container'], 0, true);
    // Union: minX=80, minY=50, maxX=380, maxY=350
    expect(result).toEqual({ x: 80, y: 50, width: 300, height: 300 });
  });

  test('ignores hidden overlays', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([['.cdk-overlay-container', { visible: false, box: { x: 0, y: 0, width: 1280, height: 720 } }]]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays);
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container'], 0, true);
    expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });

  test('ignores overlays with zero-size bounding box', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([['.cdk-overlay-container', { visible: true, box: { x: 0, y: 0, width: 0, height: 0 } }]]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays);
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container'], 0, true);
    expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });

  test('does not include overlays when includeOverflows is false', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([['.cdk-overlay-container', { visible: true, box: { x: 0, y: 0, width: 1280, height: 720 } }]]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays);
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container'], 0, false);
    expect(result).toEqual({ x: 100, y: 50, width: 200, height: 100 });
  });

  test('unions root with multiple visible overlays', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([
      ['.cdk-overlay-container', { visible: true, box: { x: 50, y: 200, width: 100, height: 50 } }],
      ['.wj-popup', { visible: true, box: { x: 400, y: 30, width: 80, height: 40 } }],
    ]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays);
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container', '.wj-popup'], 5, true);
    // Union: minX=50, minY=30, maxX=480, maxY=250
    // With margin 5: x=45, y=25, right=485, bottom=255
    expect(result).toEqual({ x: 45, y: 25, width: 440, height: 230 });
  });

  test('clamps overlay union to viewport', async () => {
    const overlays = new Map<string, { visible: boolean; box: Box | null }>([['.cdk-overlay-container', { visible: true, box: { x: 1200, y: 650, width: 200, height: 150 } }]]);
    const page = createMockPage({ x: 100, y: 50, width: 200, height: 100 }, overlays, { width: 1280, height: 720 });
    const result = await computeClipRegion(page, '.root', ['.cdk-overlay-container'], 10, true);
    // Union: minX=100, minY=50, maxX=1400, maxY=800
    // With margin 10: x=90, y=40, right=min(1280,1410)=1280, bottom=min(720,810)=720
    expect(result).toEqual({ x: 90, y: 40, width: 1190, height: 680 });
  });
});
