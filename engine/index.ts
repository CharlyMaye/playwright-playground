import { ConcreteExpectContext, ExpectContext } from './expect-service';
import { INJECTOR } from './injector';
import { ConcreteTestContext, TestContext } from './test.context';
import { AbstractType, Type } from './type';

export function register<TConcrete>(token: Type<TConcrete>): void;
export function register<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
): void;
export function register<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
) {
  return INJECTOR.register(token, useClass);
}

export function registerSingleton<TConcrete>(token: Type<TConcrete>): void;
export function registerSingleton<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
): void;
export function registerSingleton<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
) {
  return INJECTOR.registerSingleton(token, useClass);
}

export const resolve = INJECTOR.get.bind(INJECTOR);

export function registerScoped<TConcrete>(token: Type<TConcrete>): void;
export function registerScoped<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
): void;
export function registerScoped<TAbstract, TConcrete>(
  token: AbstractType<TAbstract> | Type<TAbstract>,
  useClass?: Type<TConcrete>
) {
  return INJECTOR.registerScoped(token, useClass);
}

registerSingleton(TestContext, ConcreteTestContext);
registerSingleton(ExpectContext, ConcreteExpectContext);

export { expect, test } from './fixtures';
export { Injector, InjectorMetadata } from './injector.decorator';
export { ExpectContext, TestContext };
