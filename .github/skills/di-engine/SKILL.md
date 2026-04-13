---
name: di-engine
description: Understand and work with the custom Dependency Injection engine of this project. Use this skill when debugging DI resolution errors, adding new tokens, working in the engine/ folder, or understanding how constructor injection works.
user-invocable: true
---

# DI Engine — How It Works

## Resolution mechanism

Dependencies are resolved **by constructor parameter name**. The parameter name is converted from camelCase to PascalCase to look up the registered token.

```
constructor(protected fakeService: FakeService)
                     ^^^^^^^^^^^
                     → looks up token "FakeService"
```

## @Injector decorator

Required on any concrete class that has constructor dependencies. Without it, the engine will not know which tokens to resolve.

```typescript
@Injector({ Provide: [Dep1, Dep2] })
export class ConcreteMyClass extends MyClass {
  constructor(
    protected dep1: Dep1,
    protected dep2: Dep2
  ) {
    super();
  }
}
```

## register vs registerSingleton

| Method                     | Lifecycle                        | Use case                                        |
| -------------------------- | -------------------------------- | ----------------------------------------------- |
| `register(Token)`          | New instance per `resolve()`     | POMs, stateful per-test objects                 |
| `registerSingleton(Token)` | One instance for all resolutions | Shared services, `TestContext`, `ExpectContext` |

## Built-in singletons (engine/index.ts)

`TestContext` → `ConcreteTestContext` and `ExpectContext` → `ConcreteExpectContext` are registered automatically. Do not re-register them.

## Common errors

| Error                                | Cause                     | Fix                                                |
| ------------------------------------ | ------------------------- | -------------------------------------------------- |
| `Token X is not registered`          | Missing `register()` call | Add to `setup/setup.ts`                            |
| Wrong instance resolved              | Parameter name mismatch   | Rename param to match token class name (camelCase) |
| `@Injector` missing                  | Deps not declared         | Add `@Injector({ Provide: [...] })`                |
| Double registration silently ignored | `register()` called twice | Protected by `if (this.#types.has(token)) return`  |
