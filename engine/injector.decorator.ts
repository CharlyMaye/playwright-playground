import { AbstractType, Type } from "./type";

export type InjectorMetadata = {
  Provide?: AbstractType<any>[];
};

export type InjectorType<T> = Type<T> & {
  injectorOptions?: InjectorMetadata;
};

export function isInjectorType<T>(obj: any): obj is InjectorType<T> {
  return typeof obj === "function" && "injectorOptions" in obj;
}

export function Injector(options?: InjectorMetadata) {
  return function <T>(constructor: Type<T>): InjectorType<T> {
    (constructor as InjectorType<T>).injectorOptions = options;
    return constructor as InjectorType<T>;
  };
}
