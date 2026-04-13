---
name: create-builder-pom
description: Create a new BuilderPOM using the fluent builder pattern with automatic screenshot support. Use this skill when a POM needs to chain multiple actions and optionally capture screenshots between steps.
argument-hint: '[feature name]'
---

# Create a Builder POM

## Context

`BuilderPOM` uses the builder/fluent pattern. Actions are queued with `_addAction()` and executed sequentially via `.execute()`. When `enableScreenshot()` is active, a screenshot is taken after each action.

## Rules

1. Define an **abstract** class `<Feature>POM` extending `BuilderPOM<TSelectors>` with all public action methods declared abstract.
2. Define `Concrete<Feature>POM` extending `ConcreteBuilderPOM<TSelectors>` and implementing the abstract class.
3. Wrap every user action with `return this._addAction(async () => { ... })` — this enables fluent chaining and screenshot capture.
4. `this._page` (Playwright `Page`) is provided by `ConcreteBuilderPOM` — no need to inject it separately.
5. `this._selectors` must be typed with a local `type` and initialized as a class field.
6. Export only the abstract class from `POM/index.ts`.
7. Register in `setup/setup.ts`: `register(<Feature>POM, Concrete<Feature>POM)`.

## Template

```typescript
import { BuilderPOM, ConcreteBuilderPOM } from './BuilderPOM';
import { ExpectContext, TestContext } from '../engine';

type <Feature>Selectors = {
  myButton: string;
};

export abstract class <Feature>POM extends BuilderPOM<<Feature>Selectors> {
  abstract clickMyButton(): this;
}

export class Concrete<Feature>POM
  extends ConcreteBuilderPOM<<Feature>Selectors>
  implements <Feature>POM
{
  protected _selectors: <Feature>Selectors = {
    myButton: 'button#my-btn',
  };

  constructor(testContext: TestContext, expectContext: ExpectContext) {
    super(testContext, expectContext);
  }

  public clickMyButton(): this {
    return this._addAction(async () => {
      await this._page.locator(this._selectors.myButton).click();
    });
  }
}
```

## Usage in tests

```typescript
test('builder interaction', {}, async ({ instance }) => {
  await instance.enableScreenshot().clickMyButton().execute();
});
```

## Checklist

- [ ] Abstract class exported from `POM/index.ts`
- [ ] Concrete class registered in `setup/setup.ts` with abstract token: `register(<Feature>POM, Concrete<Feature>POM)`
