import { describe, it, expect, beforeEach } from 'vitest';
import { switchGameMode } from '../store/slices/gameSlice';
import { getGeneratorPoint, hexToBigint, pointMultiply } from '../utils/ecc';
import { createTestStore, type TestStore } from '../utils/testUtils';

describe('State Bleeding Integration Tests', () => {
  let store: TestStore;

  beforeEach(() => {
    store = createTestStore();
  });

  it('should prevent cross-mode victory exploitation', () => {
    // Start in practice mode
    const scalar = hexToBigint('2a');
    store.dispatch(switchGameMode('practice'));

    // Set up practice mode with a known private key
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: scalar.toString(16),
      },
    });

    store.dispatch(switchGameMode('daily'));

    // Try the exploit: connect daily generator to practice challenge
    const generator = getGeneratorPoint();
    const practiceInDaily = pointMultiply(scalar, generator);

    store.dispatch({
      type: 'dailyCalculator/addOperationToGraph',
      payload: {
        fromPoint: generator,
        toPoint: practiceInDaily,
        operation: {
          id: 'attempt-exploit',
          type: 'multiply',
          description: 'Attempt exploit',
          value: scalar.toString(),
        },
      },
    });

    // Check win condition
    store.dispatch({ type: 'dailyCalculator/checkWinCondition' });

    const state = store.getState();

    // Daily mode should not win
    expect(state.dailyCalculator.hasWon).toBe(false);

    // Practice mode should not be affected
    expect(state.practiceCalculator.hasWon).toBe(false);
  });
});
