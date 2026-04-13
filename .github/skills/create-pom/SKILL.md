---
name: create-pom
description: Create a new simple Page Object Model (POM) class in this Playwright + DI framework. Use this skill when asked to create a POM, a page object, or a new page abstraction targeting a URL with TestContext and ExpectContext injection.
argument-hint: '[feature name] [target URL]'
---

# Create a Simple POM

## Context

This project uses a custom Dependency Injection engine. POMs receive `TestContext` and `ExpectContext` via constructor injection — never instantiate dependencies manually.

## Rules

1. Create the file in `POM/` named `<FeatureName>POM.ts`.
2. The constructor must accept `TestContext` and `ExpectContext` as parameters (resolved by DI via parameter name matching).
3. Use `this.testContext.page` for all Playwright interactions.
4. Use `this.expectContext.expectToHaveScreenshot()` for visual assertions — never call `expect(page).toHaveScreenshot()` directly.
5. Navigation must use `page.goto(url, { waitUntil: 'load' })`.
6. Dismiss cookie banners inside a `try/catch` block.
7. Export the class from `POM/index.ts`.
8. Register in `setup/setup.ts` with `register(<FeatureName>POM)`.

## Template

```typescript
import { ExpectContext, TestContext } from '../engine';

export class <FeatureName>POM {
  constructor(
    protected testContext: TestContext,
    protected expectContext: ExpectContext
  ) {}

  public async goto(): Promise<void> {
    await this.testContext.page.goto('https://...', { waitUntil: 'load' });

    try {
      await this.testContext.page
        .locator('button', { hasText: 'Okay, got it' })
        .click();
    } catch {
      console.warn('No cookie banner to dismiss');
    }
  }
}
```

## Checklist

- [ ] File created in `POM/<FeatureName>POM.ts`
- [ ] Class exported from `POM/index.ts`
- [ ] Class registered in `setup/setup.ts`
