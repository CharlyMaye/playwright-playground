# Copilot Coding Agent Instructions

## Project Overview

Playwright testing framework with a custom Dependency Injection (DI) engine, Page Object Model patterns, and V8 code coverage reporting. Tests target Angular Material web applications.

## Build & Validation

```bash
# Install dependencies
npm install

# Install Playwright browsers (required after install)
playwright install && playwright install-deps

# Run all tests
npm run test

# Lint
npm run lint

# Format
npm run format
```

There is no separate build step — TypeScript is compiled on-the-fly by Playwright.

## Testing

- All tests live in `tests/` as `*.spec.ts` files.
- Run a single test file: `npx playwright test tests/my-test.spec.ts`
- Tests require a network connection to `https://material.angular.dev/`.
- Visual snapshot files are in `tests/*.spec.ts-snapshots/` — update them with `npx playwright test --update-snapshots` when UI intentionally changes.
- Unit tests for the engine are in `engine/__tests__/`.

## Key Conventions

### Dependency Injection

- Never use `new` to instantiate POMs or services in tests — always rely on the `instance` fixture.
- All new POMs must be registered in `setup/setup.ts` via `register()` or `registerSingleton()`.
- Constructor parameter names must match registered token class names (camelCase of class name).
- Use `@Injector({ Provide: [Dep1, Dep2] })` on any class that has constructor dependencies.

### Page Object Models

- Simple POMs: class in `POM/`, constructor receives `TestContext` and `ExpectContext`.
- Builder POMs: abstract class extends `BuilderPOM<TSelectors>`, concrete extends `ConcreteBuilderPOM<TSelectors>`.
- All POMs exported from `POM/index.ts`.
- Navigation: `page.goto(url, { waitUntil: 'load' })`.
- Visual assertions: `expectContext.expectToHaveScreenshot()` — not raw `expect(page).toHaveScreenshot()`.

### Test Files

- Import `test as baseTest` and `expect` from `'../engine'`.
- Pattern: `const test = baseTest<MyPOM>(MyPOM)` then `const { describe } = test`.
- Test signature: `test('name', {}, async ({ instance, expectContext, testContext }) => { ... })`.

## File Structure

```
engine/          # DI engine, fixtures, TestContext, ExpectContext
POM/             # Page Object Models
setup/setup.ts   # DI registrations (production)
tests/           # Playwright spec files
engine/__tests__/ # Engine unit tests (separate DI via engine/__tests__/register.ts)
```

## Linting & Formatting

- ESLint with `eslint-plugin-playwright` — run `npm run lint:fix` to auto-fix.
- Prettier for formatting — enforced on save via VS Code settings.
- Do not bypass lint with `// eslint-disable` unless strictly necessary.
