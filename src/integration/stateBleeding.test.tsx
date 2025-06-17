import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach } from 'vitest';
import eccCalculatorReducer from '../store/slices/eccCalculatorSlice';
import gameReducer, { switchGameMode } from '../store/slices/gameSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';
import { getGeneratorPoint, hexToBigint, pointMultiply } from '../utils/ecc';

describe('State Bleeding Integration Tests - Store Level', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        game: gameReducer,
        dailyCalculator: eccCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
        practiceMode: practiceModeReducer,
        theme: themeReducer,
        ui: uiReducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore BigInt values in ECC points for testing
            ignoredActions: [
              'dailyCalculator/addOperationToGraph',
              'practiceCalculator/addOperationToGraph',
            ],
            ignoredPaths: [
              'dailyCalculator.selectedPoint',
              'dailyCalculator.graph',
              'practiceCalculator.selectedPoint',
              'practiceCalculator.graph',
            ],
          },
        }),
    });
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

    let state = store.getState();
    store.dispatch(switchGameMode('daily'));

    state = store.getState();

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

    state = store.getState();

    // Daily mode should not win
    expect(state.dailyCalculator.hasWon).toBe(false);

    // Practice mode should not be affected
    expect(state.practiceCalculator.hasWon).toBe(false);
  });
});
