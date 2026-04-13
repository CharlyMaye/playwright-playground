# GitHub Copilot Instructions

## Project Overview

This is a Playwright testing framework with a custom Dependency Injection (DI) engine, Page Object Model (POM) patterns, and V8 code coverage reporting. It is used to test Angular Material web applications.

## Key Architecture

### Dependency Injection Engine (`engine/`)

- `Injector` class manages `register()` (transient) and `registerSingleton()` factories.
- Dependencies are resolved **by constructor parameter names** (reflection-based, see `reflection.utils.ts`).
- Use the `@Injector({ Provide: [...] })` decorator to declare what a class depends on.
- `TestContext` and `ExpectContext` are registered as **singletons** automatically.
- Custom classes must be registered in `setup/setup.ts` via `register()` or `registerSingleton()`.

### Playwright Fixtures (`engine/fixtures/fixture.ts`)

The `test<T>(token)` factory extends Playwright's `base.extend` and provides:

- `instance: T` — resolved instance of the POM/service under test (via DI)
- `testContext: TestContext` — gives access to `page`, `request`, `browser`, `browserName`
- `expectContext: ExpectContext` — provides `expectToHaveScreenshot()` and `checkValue()`
- V8 code coverage is collected automatically per test

### Page Object Model (`POM/`)

- Simple POMs extend nothing; they receive `TestContext` and `ExpectContext` via constructor injection.
- Complex POMs use `BuilderPOM` (builder/fluent pattern): actions are queued, screenshots taken between steps when enabled.

### Test files (`tests/`)

- Tests import `test as baseTest` and `expect` from `'../engine'`.
- Tests import the POM from `'../POM'`.
- Create the typed test: `const test = baseTest<MyPOM>(MyPOM)`.
- Destructure `describe` from `test`.
- The test signature is: `test('name', {}, async ({ instance, expectContext, testContext }) => { ... })`.

## Conventions

- Abstract classes define contracts; concrete classes implement them.
- File naming: `FooClass.ts` (abstract + concrete in the same file).
- Registration of POMs/services is done in `setup/setup.ts`.
- `engine/__tests__/register.ts` handles DI registration for unit tests only.
- Never use `new` to create POM/service instances in tests — always rely on `instance` fixture.
- Use `testContext.page` for Playwright `Page` access inside tests.
- Prefer `expectContext.expectToHaveScreenshot()` over raw `expect(page).toHaveScreenshot()`.
- Use `page.goto(url, { waitUntil: 'load' })` for navigation.
