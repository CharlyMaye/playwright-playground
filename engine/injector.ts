import { isInjectorType } from './injector.decorator';
import { camelToPascalCase, getConstructorParameterNames } from './reflection.utils';
import { AbstractType, isType, Type } from './type';

class Injector {
  #types = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #typesByName = new Map<string, AbstractType<any>>();

  #singletonTypes = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #singletonTypesByName = new Map<string, AbstractType<any>>();

  #createdInstance = new Map<AbstractType<any> | Type<any>, any>();

  public register<TConcrete>(token: Type<TConcrete>): void;
  public register<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void;
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

  public registerSingleton<TConcrete>(token: Type<TConcrete>): void;
  public registerSingleton<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void;
  public registerSingleton<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void {
    if (this.#singletonTypes.has(token)) {
      // throw new Error(`Token ${token.name} is already registered`);
      return;
    }
    if (!isType(useClass)) {
      useClass = token as Type<TConcrete>;
    }
    this.#singletonTypes.set(token, useClass);
    this.#singletonTypesByName.set(token.name, token);
  }

  public get<T>(token: AbstractType<T> | Type<T>): T {
    // Est il enregistrer dans la liste des singletons ?
    if (this.#singletonTypes.has(token)) {
      return this.#getSingleton(token);
    }

    const resolved = this.#types.get(token);
    if (!resolved) {
      throw new Error(`Token ${token.name} is not registered`);
    }

    const constructorArgs = this.#handleArgsInConstructor<T>(resolved);
    const instance: T = new resolved(...constructorArgs) as T;
    return instance;
  }

  #getSingleton<T>(token: AbstractType<T> | Type<T>): T {
    const resolved: Type<T> = this.#singletonTypes.get(token) as Type<T>;
    if (!resolved) {
      throw new Error(`Token ${token.name} is not registered as singleton`);
    }
    if (this.#createdInstance.has(token)) {
      return this.#createdInstance.get(token) as T;
    }

    const constructorArgs = this.#handleArgsInConstructor<T>(resolved);
    const instance = new resolved(...constructorArgs);
    this.#createdInstance.set(token, instance);
    return instance;
  }

  #handleArgsInConstructor<T>(resolved: Type<unknown>): unknown[] {
    if (isInjectorType<T>(resolved) && resolved.injectorOptions?.Provide) {
      return resolved.injectorOptions.Provide.map((dep: AbstractType<unknown>) => this.get(dep));
    } else {
      const parameterNames = getConstructorParameterNames(resolved);
      return parameterNames.map((paramName) => {
        const typeName = camelToPascalCase(paramName);
        const abstractType = this.#typesByName.get(typeName) || this.#singletonTypesByName.get(typeName);
        if (abstractType) {
          return this.get(abstractType) as unknown;
        } else {
          throw new Error(
            `No registered type found for parameter '${paramName}' (looking for type '${typeName}'). Make sure it is registered in the injector or the argument name is equal to its type.`
          );
        }
      });
    }
  }
}

export const INJECTOR = new Injector();
