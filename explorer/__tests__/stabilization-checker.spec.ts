import { expect, test } from '@playwright/test';
import { ConcreteTestContext } from '../../engine/test.context';
import { PlaywrightStabilizationChecker } from '../adapters/playwright/PlaywrightStabilizationChecker';
import { ConcreteExplorationConfig, PartialExplorationConfig } from '../ExplorationConfig';

/**
 * Behavioural proof for the quiescence-based stabilization. Timing assertions
 * use wide margins so they stay reliable under CI load — they check the order
 * of magnitude (quiet → fast, activity → waited, fixed → full delay), never an
 * exact duration.
 */
async function measureStable(page: import('@playwright/test').Page, overrides: PartialExplorationConfig, timeoutMs?: number): Promise<number> {
  const config = new ConcreteExplorationConfig(overrides);
  const testContext = new ConcreteTestContext();
  testContext.page = page;
  const checker = new PlaywrightStabilizationChecker(testContext, config);

  const start = Date.now();
  await checker.waitUntilStable(timeoutMs);
  return Date.now() - start;
}

test.describe('PlaywrightStabilizationChecker', () => {
  test('dom-quiet returns quickly on a static page (well under the cap)', async ({ page }) => {
    await page.setContent('<button id="a">A</button>');

    const elapsed = await measureStable(page, {
      stabilizationStrategy: 'dom-quiet',
      stabilizationQuietPeriod: 50,
      stabilizationTimeout: 2000,
    });

    // Settles after roughly one quiet window, nowhere near the 2s cap.
    expect(elapsed).toBeLessThan(800);
  });

  test('dom-quiet waits through ongoing DOM mutations, then settles before the cap', async ({ page }) => {
    // Mutates every 50ms for ~300ms, then stops.
    await page.setContent(`
      <div id="x">0</div>
      <script>
        let n = 0;
        const id = setInterval(() => {
          n++;
          document.getElementById('x').textContent = String(n);
          if (n >= 6) clearInterval(id);
        }, 50);
      </script>
    `);

    const elapsed = await measureStable(page, {
      stabilizationStrategy: 'dom-quiet',
      stabilizationQuietPeriod: 50,
      stabilizationTimeout: 3000,
    });

    // Waited through the ~300ms of activity, but did not hit the 3s cap.
    expect(elapsed).toBeGreaterThan(250);
    expect(elapsed).toBeLessThan(2000);
  });

  test('layout check waits for a CSS animation that mutates no DOM', async ({ page }) => {
    // A finite CSS keyframe animation resizes #box over 300ms — no DOM mutation,
    // so only the layout heuristic can detect it.
    const html = `
      <style>
        @keyframes grow { from { width: 50px; } to { width: 300px; } }
        #box { height: 20px; background: red; animation: grow 0.3s forwards; }
      </style>
      <div id="box"></div>
    `;

    await page.setContent(html);
    const domQuietOnly = await measureStable(page, {
      rootSelector: '#box',
      stabilizationStrategy: 'dom-quiet',
      stabilizationQuietPeriod: 50,
      stabilizationTimeout: 3000,
    });

    await page.setContent(html); // restart the animation from scratch
    const withLayout = await measureStable(page, {
      rootSelector: '#box',
      stabilizationStrategy: 'dom-quiet+layout',
      stabilizationQuietPeriod: 50,
      stabilizationTimeout: 3000,
    });

    // dom-quiet ignores the (DOM-silent) animation and returns fast;
    // dom-quiet+layout waits for the box to stop moving.
    expect(domQuietOnly).toBeLessThan(250);
    expect(withLayout).toBeGreaterThan(250);
  });

  test('fixed strategy waits the full stabilizationTimeout', async ({ page }) => {
    await page.setContent('<button id="a">A</button>');

    const elapsed = await measureStable(page, {
      stabilizationStrategy: 'fixed',
      stabilizationTimeout: 400,
    });

    // Unconditional wait: close to 400ms regardless of the (idle) page.
    expect(elapsed).toBeGreaterThan(350);
    expect(elapsed).toBeLessThan(1200);
  });

  test('timeoutMs override caps the wait (used by the "stable" sequence condition)', async ({ page }) => {
    await page.setContent('<button id="a">A</button>');

    // Config cap is 5s, but the per-call override (300ms) must win — in 'fixed'
    // mode this is exactly the wait, proving the override reaches the impl.
    const elapsed = await measureStable(page, { stabilizationStrategy: 'fixed', stabilizationTimeout: 5000 }, 300);

    expect(elapsed).toBeGreaterThan(250);
    expect(elapsed).toBeLessThan(1200);
  });
});
