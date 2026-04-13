---
name: register-dependency
description: Register a new class or service in the DI container of this project. Use this skill when a new POM or service needs to be wired into the dependency injection system via setup/setup.ts or engine/__tests__/register.ts.
argument-hint: '[class name] [abstract token if any]'
---

# Register a Dependency in the DI Container

## Context

The DI engine resolves dependencies by **constructor parameter name** — the parameter name must match the registered token's class name in camelCase. Registration must happen before any test runs.

## Rules

1. Add registrations in `setup/setup.ts` inside `setup()`, after the `isAlreadySetup` guard.
2. **Transient** (new instance per `resolve()` call): `register(Token)` or `register(AbstractToken, ConcreteClass)`.
3. **Singleton** (shared instance): `registerSingleton(Token)` or `registerSingleton(AbstractToken, ConcreteClass)`.
4. `TestContext` and `ExpectContext` are already singletons registered in `engine/index.ts` — never re-register them.
5. For unit-test-only dependencies, register in `engine/__tests__/register.ts` instead of `setup/setup.ts`.
6. If the class has constructor dependencies, annotate it with `@Injector({ Provide: [Dep1, Dep2] })` in its class file.
7. Constructor parameter names must match token class names: e.g. `fakeService` resolves `FakeService`.

## setup/setup.ts pattern

```typescript
import { register, registerSingleton } from '../engine';
import { MyPOM } from '../POM';
import { MyAbstractService } from '../services/MyService';
import { ConcreteMyService } from '../services/MyService';

let isAlreadySetup = false;
export function setup() {
  if (isAlreadySetup) return;

  register(MyPOM); // simple transient
  register(MyAbstractService, ConcreteMyService); // abstract → concrete
  registerSingleton(MySharedService); // singleton

  isAlreadySetup = true;
}
```

## @Injector decorator (for classes with their own dependencies)

```typescript
import { Injector } from '../engine';
import { SomeDependency } from './SomeDependency';

@Injector({ Provide: [SomeDependency] })
export class ConcreteMyService extends MyAbstractService {
  constructor(protected someDependency: SomeDependency) {
    super();
  }
}
```
