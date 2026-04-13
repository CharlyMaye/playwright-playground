/** TODOD - lien vers le code d angular */
export const Type = Function;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface AbstractType<T> extends Function {
  prototype: T;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export interface Type<T> extends Function {
  new (...args: any[]): T;
}

export function isType<T>(obj: unknown): obj is Type<T> {
  return (
    typeof obj === 'function' &&
    'prototype' in obj &&
    obj.prototype !== null &&
    typeof obj.prototype === 'object' &&
    (obj.prototype as Record<string, unknown>).constructor === obj
  );
}
