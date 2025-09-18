import { isInjectorType } from "./injector.decorator";
import {
  camelToPascalCase,
  getConstructorParameterNames,
} from "./reflection.utils";
import { AbstractType, isType, Type } from "./type";

class Injector {
  #types = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #typesByName = new Map<string, AbstractType<any>>();
  #createdInstance = new Map<AbstractType<any> | Type<any>, any>();

  public register<TConcrete>(token: Type<TConcrete>): void;
  public register<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void {
    if (this.#types.has(token)) {
      // throw new Error(`Token ${token.name} is already registered`);
      return;
    }
    if (!isType(useClass)) {
      useClass = token as Type<TConcrete>;
    }
    this.#types.set(token, useClass);
    this.#typesByName.set(token.name, token);
  }

  public get<T>(token: AbstractType<T> | Type<T>): T {
    const resolved = this.#types.get(token);
    if (!resolved) {
      throw new Error(`Token ${token.name} is not registered`);
    }
    if (this.#createdInstance.has(resolved)) {
      return this.#createdInstance.get(resolved);
    }

    let constructorArgs = this.#handleArgsInConstructor<T>(resolved);
    this.#handleTestContext(resolved, constructorArgs);

    const instance = new resolved(...constructorArgs);
    this.#createdInstance.set(resolved, instance);
    return instance as T;
  }

  #handleTestContext<T>(resolved: Type<T>, constructorArgs: unknown[]) {
    // Manipulez le contexte de test ici si nécessaire
  }

  #handleArgsInConstructor<T>(resolved: Type<unknown>) {
    let constructorArgs: unknown[] = [];

    if (isInjectorType<T>(resolved) && resolved.injectorOptions?.Provide) {
      constructorArgs = resolved.injectorOptions.Provide.map(
        (dep: AbstractType<unknown>) => this.get(dep)
      );
    } else {
      const parameterNames = getConstructorParameterNames(resolved);
      constructorArgs = parameterNames.map((paramName) => {
        const typeName = camelToPascalCase(paramName);
        const abstractType = this.#typesByName.get(typeName);
        if (abstractType) {
          return this.get(abstractType);
        } else {
          throw new Error(
            `No registered type found for parameter '${paramName}' (looking for type '${typeName}'). Make sure it is registered in the injector or the argument name is equal to its type.`
          );
        }
      });
    }

    return constructorArgs;
  }
}

export const INJECTOR = new Injector();
