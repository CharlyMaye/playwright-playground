import { test as baseTest, expect } from '../index';
import { FakeClass } from './FakeClass';

const test = baseTest(FakeClass);

test('fake test with fixture', async ({ instance }) => {
  expect(instance).toBeDefined();
  expect(instance).toBeInstanceOf(FakeClass);
});
