/**
 * RuleRegistry<T> — generic rule store.
 * register() replaces the current set. getAll() returns a read-only snapshot.
 */
export class RuleRegistry<T> {
  #rules: T[] = [];

  register(rules: T[]): void {
    this.#rules = rules;
  }

  getAll(): T[] {
    return this.#rules;
  }
}
