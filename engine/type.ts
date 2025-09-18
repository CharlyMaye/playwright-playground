/** TODOD - lien vers le code d angular */
export const Type = Function;

export interface AbstractType<T> extends Function {
  prototype: T;
}

export interface Type<T> extends Function {
  new (...args: any[]): T;
}

export function isType<T>(obj: any): obj is Type<T> {
  return typeof obj === 'function' && obj.prototype && obj.prototype.constructor === obj;
}
