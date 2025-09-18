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
  return (INJECTOR as any).register(token, useClass);
}

export const resolve = INJECTOR.get.bind(INJECTOR);

register(TestContext, ConcreteTestContext);
register(ExpectContext, ConcreteExpectContext);

export { expect, test } from './fixtures';
export { Injector, InjectorMetadata } from './injector.decorator';
export { ExpectContext, TestContext };
