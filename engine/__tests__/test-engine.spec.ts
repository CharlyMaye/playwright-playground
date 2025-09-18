import { test as baseTest, expect } from '../index';
import { FakeClass } from './FakeClass';

const test = baseTest(FakeClass);

// 1. Test de base avec fixture (fonction résolvant l'injection de dépendance)
test('basic test with dependency injection', async ({ instance }) => {
  expect(instance).toBeDefined();
  expect(instance).toBeInstanceOf(FakeClass);
});

// 2. Test avec DETAILS optionnels et ANNOTATIONS
test(
  'test with details and annotations',
  {
    tag: ['@smoke', '@regression'],
    annotation: [
      { type: 'issue', description: 'https://github.com/myproject/issues/123' },
      { type: 'documentation', description: 'See docs/testing.md' },
    ],
  },
  async ({ instance }) => {
    expect(instance).toBeDefined();
  }
);

// 3. Test avec test.SKIP()
test.skip('test that is skipped', async ({ instance }) => {
  throw new Error('This should not run');
});

// 4. Test avec test.skip() ET details
test.skip(
  'skipped test with details',
  {
    tag: '@manual',
  },
  async ({ instance }) => {
    throw new Error('This should not run either');
  }
);

// 5. Test avec test.ONLY()
// test.only("focused test", async ({ instance }) => {
//   expect(instance).toBeDefined();
// });

// 6. Test avec test.DESCRIBE()
test.describe('Group of related tests', () => {
  test('first test in group', async ({ instance }) => {
    expect(instance).toBeDefined();
  });

  test(
    'second test in group',
    {
      tag: '@fast',
    },
    async ({ instance }) => {
      expect(instance).toBeDefined();
    }
  );

  // Nested describe
  test.describe('Nested group', () => {
    test('nested test', async ({ instance }) => {
      expect(instance).toBeDefined();
    });
  });
});

// 7. Démonstration que tous les types d'overloads fonctionnent
test.describe('Overload demonstrations', () => {
  // Overload 1: (title, body)
  test('simple overload', async ({ instance }) => {
    expect(instance).toBeInstanceOf(FakeClass);
  });

  // Overload 2: (title, details, body)
  test(
    'complex overload',
    {
      tag: '@complex',
      annotation: { type: 'performance', description: 'Check response time' },
    },
    async ({ instance }) => {
      expect(instance).toBeInstanceOf(FakeClass);
    }
  );
});
