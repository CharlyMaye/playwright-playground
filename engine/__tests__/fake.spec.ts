import { expect, test } from '@playwright/test';
import { resolve } from '../index';
import { FakeClass } from './FakeClass';

test('fake test', {}, () => {
  const instance = resolve(FakeClass);
  expect(instance).toBeTruthy();
  expect(instance).toBeInstanceOf(FakeClass);
});
