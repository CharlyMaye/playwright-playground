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

export function isType<T>(obj: any): obj is Type<T> {
  return typeof obj === 'function' && obj.prototype && obj.prototype.constructor === obj;
}
