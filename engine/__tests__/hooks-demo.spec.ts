import { test as baseTest, expect } from '../index';
import { FakeClass } from './FakeClass';

const test = baseTest(FakeClass);

test.describe('Démonstration des hooks', () => {
  test('premier test avec hooks', ({ instance }) => {
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(FakeClass);
  });

  test('deuxième test avec hooks', ({ instance }) => {
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(FakeClass);
  });

  test('troisième test avec hooks', ({ instance }) => {
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(FakeClass);
  });
});
