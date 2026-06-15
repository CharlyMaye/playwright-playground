import { isInjectorType } from './injector.decorator';
import { camelToPascalCase, getConstructorParameterNames } from './reflection.utils';
import { AbstractType, isType, Type } from './type';

class Injector {
  #types = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #typesByName = new Map<string, AbstractType<any>>();

  #singletonTypes = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #singletonTypesByName = new Map<string, AbstractType<any>>();

  #scopedTypes = new Map<AbstractType<any> | Type<any>, Type<any>>();
  #scopedTypesByName = new Map<string, AbstractType<any>>();

  #createdInstance = new Map<AbstractType<any> | Type<any>, any>();
  #scopedInstances = new Map<AbstractType<any> | Type<any>, any>();
  #inScope = false;

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

  public registerScoped<TConcrete>(token: Type<TConcrete>): void;
  public registerScoped<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void;
  public registerScoped<TAbstract, TConcrete>(
    token: AbstractType<TAbstract> | Type<TAbstract>,
    useClass?: Type<TConcrete>
  ): void {
    if (this.#scopedTypes.has(token)) {
      return;
    }
    if (!isType(useClass)) {
      useClass = token as Type<TConcrete>;
    }
    this.#scopedTypes.set(token, useClass);
    this.#scopedTypesByName.set(token.name, token);
  }

  public beginScope(): void {
    this.#scopedInstances.clear();
    this.#inScope = true;
  }

  public endScope(): void {
    this.#scopedInstances.clear();
    this.#inScope = false;
  }

  public provideScopedInstance<T>(token: AbstractType<T> | Type<T>, instance: T): void {
    if (!this.#inScope) {
      throw new Error('Cannot provide scoped instance outside of a scope');
    }
    if (!this.#scopedTypes.has(token)) {
      throw new Error(`Token ${token.name} is not registered as scoped`);
    }
    this.#scopedInstances.set(token, instance);
  }

  public get<T>(token: AbstractType<T> | Type<T>): T {
    // Est il enregistré dans la liste des singletons ?
    if (this.#singletonTypes.has(token)) {
      return this.#getSingleton(token);
    }

    // Scoped : 1 instance par scope
    if (this.#scopedTypes.has(token)) {
      return this.#getScoped(token);
    }

    const resolved = this.#types.get(token);
    if (!resolved) {
      throw new Error(`Token ${token.name} is not registered`);
    }

    const constructorArgs = this.#handleArgsInConstructor<T>(resolved);
    const instance: T = new resolved(...constructorArgs) as T;
    return instance;
  }

  #getScoped<T>(token: AbstractType<T> | Type<T>): T {
    if (!this.#inScope) {
      throw new Error(
        `Token ${token.name} is registered as scoped but no scope is active. Call beginScope() before resolving scoped tokens.`
      );
    }
    if (this.#scopedInstances.has(token)) {
      return this.#scopedInstances.get(token) as T;
    }
    const resolved = this.#scopedTypes.get(token) as Type<T>;
    if (!resolved) {
      throw new Error(`Token ${token.name} is not registered as scoped`);
    }
    const constructorArgs = this.#handleArgsInConstructor<T>(resolved);
    const instance = new resolved(...constructorArgs);
    this.#scopedInstances.set(token, instance);
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
        const abstractType =
          this.#typesByName.get(typeName) ||
          this.#scopedTypesByName.get(typeName) ||
          this.#singletonTypesByName.get(typeName);
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
