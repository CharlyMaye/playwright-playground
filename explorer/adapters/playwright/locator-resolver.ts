import type { Locator, Page } from '@playwright/test';

/**
 * Single uid → Locator resolution strategy shared by the exploration
 * executor and the replay POM, so both always resolve the same element.
 *
 * Priority:
 * 1. `nativeSelector` — page-level CSS selector captured by the extractor
 *    (most reliable, avoids index drift)
 * 2. `testid:xxx` uid
 * 3. `#id` uid (page-level)
 * 4. `role:"name"` uid
 * 5. `role[index]` / `tag[index]` uid
 * 6. fallback — treat the uid as a selector
 */
export function resolveTargetLocator(page: Page, root: Locator, uid: string, nativeSelector?: string): Locator {
  if (nativeSelector) {
    return page.locator(nativeSelector);
  }

  if (uid.startsWith('testid:')) {
    return root.getByTestId(uid.slice('testid:'.length));
  }
  if (uid.startsWith('#')) {
    return page.locator(uid);
  }
  const roleMatch = uid.match(/^(\w+):"(.+)"$/);
  if (roleMatch) {
    return root.getByRole(roleMatch[1] as Parameters<typeof root.getByRole>[0], { name: roleMatch[2] });
  }
  const indexMatch = uid.match(/^(\w+)\[(\d+)\]$/);
  if (indexMatch) {
    return root.locator(indexMatch[1]).nth(parseInt(indexMatch[2], 10));
  }
  return root.locator(uid);
}
