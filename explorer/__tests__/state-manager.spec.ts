import { expect, test } from '@playwright/test';
import { ConcreteExplorationConfig } from '../ExplorationConfig';
import { ConcreteStateManager } from '../StateManager';
import { ElementFact } from '../types';

function makeFact(overrides: Partial<ElementFact> = {}): ElementFact {
  return {
    uid: 'button[0]',
    tag: 'button',
    role: 'button',
    accessibleName: 'Submit',
    visible: true,
    enabled: true,
    focusable: true,
    text: 'Submit',
    inputType: null,
    ariaExpanded: null,
    ariaControls: null,
    ariaOwns: null,
    tabindex: null,
    contentEditable: false,
    boundingBox: null,
    isInScope: true,
    parentUid: null,
    ...overrides,
  };
}

test.describe('StateManager', () => {
  test.describe('hash consistency', () => {
    test('identical facts produce the same hash', () => {
      const config = new ConcreteExplorationConfig({ domHashStrategy: 'interactive-only' });
      const sm = new ConcreteStateManager(config);
      const facts = [makeFact()];
      const s1 = sm.captureState(facts, 0, 'body');
      const s2 = sm.captureState(facts, 0, 'body');
      expect(s1.id).toBe(s2.id);
    });

    test('adding a button produces a different hash', () => {
      const config = new ConcreteExplorationConfig({ domHashStrategy: 'interactive-only' });
      const sm = new ConcreteStateManager(config);
      const facts1 = [makeFact()];
      const facts2 = [makeFact(), makeFact({ uid: 'button[1]', accessibleName: 'Cancel' })];
      const s1 = sm.captureState(facts1, 0, 'body');
      const s2 = sm.captureState(facts2, 0, 'body');
      expect(s1.id).not.toBe(s2.id);
    });

    test('changing text does NOT change hash in interactive-only mode', () => {
      const config = new ConcreteExplorationConfig({ domHashStrategy: 'interactive-only' });
      const sm = new ConcreteStateManager(config);
      const facts1 = [makeFact({ text: 'Submit' })];
      const facts2 = [makeFact({ text: 'Submit Now' })];
      const s1 = sm.captureState(facts1, 0, 'body');
      const s2 = sm.captureState(facts2, 0, 'body');
      // Text is not part of interactive-only hash
      expect(s1.id).toBe(s2.id);
    });
  });

  test.describe('isNewState + registerState', () => {
    test('isNewState returns true then false after register', () => {
      const config = new ConcreteExplorationConfig();
      const sm = new ConcreteStateManager(config);
      const state = sm.captureState([makeFact()], 0, 'body');
      expect(sm.isNewState(state.id)).toBe(true);
      sm.registerState(state);
      expect(sm.isNewState(state.id)).toBe(false);
    });
  });
});
