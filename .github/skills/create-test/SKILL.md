---
name: create-test
description: Create a new Playwright test file using the custom DI engine and fixtures of this project. Use this skill when asked to write a test, a spec file, or test cases for a POM class.
argument-hint: '[POM class name] [test description]'
---

# Create a Playwright Test

## Context

Tests use a custom `test` factory built on top of Playwright fixtures. The DI engine resolves the POM instance automatically — never use `new` in tests.

## Rules

1. Import `test as baseTest` and `expect` from `'../engine'` — **not** from `@playwright/test`.
2. Import the POM from `'../POM'`.
3. Create the typed test: `const test = baseTest<MyPOM>(MyPOM)`.
4. Destructure `{ describe }` from `test`.
5. Use `describe('Suite', () => { ... })` to group related tests.
6. Test signature: `test('name', {}, async ({ instance, expectContext, testContext }) => { ... })`.
7. Never instantiate the POM with `new` — always use the `instance` fixture.
8. Use `testContext.page.url()` to assert the current URL.
9. Use `expectContext.expectToHaveScreenshot()` for visual regression snapshots.
10. Place the file in `tests/` named `<feature>.spec.ts`.

## Template

```typescript
import { test as baseTest, expect } from '../engine';
import { MyFeaturePOM } from '../POM';

const test = baseTest<MyFeaturePOM>(MyFeaturePOM);
const { describe } = test;

describe('My Feature', () => {
  test('should navigate to the page', {}, async ({ instance, expectContext, testContext }) => {
    await instance.goto();
    expect(testContext.page.url()).toBe('https://...');
    await expectContext.expectToHaveScreenshot();
  });
});
```

## Available fixtures

| Fixture         | Type            | Description                                           |
| --------------- | --------------- | ----------------------------------------------------- |
| `instance`      | `T` (your POM)  | DI-resolved POM instance                              |
| `testContext`   | `TestContext`   | Access to `page`, `request`, `browser`, `browserName` |
| `expectContext` | `ExpectContext` | `expectToHaveScreenshot()`, `checkValue()`            |
