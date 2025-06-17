import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer, { switchGameMode } from '../store/slices/gameSlice';
import eccCalculatorReducer from '../store/slices/eccCalculatorSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';
import { getGeneratorPoint, pointMultiply } from '../utils/ecc';
import { clearDailyState, clearPracticeState } from '../utils/storage';

describe('Selected Point Persistence Tests', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Clear in-memory state before each test
    clearDailyState();
    clearPracticeState();

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
              'dailyCalculator/clearGraph',
              'practiceCalculator/clearGraph',
              'dailyCalculator/saveState',
              'practiceCalculator/saveState',
              'dailyCalculator/loadState',
              'practiceCalculator/loadState',
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

  it('should maintain selected point when switching between practice and daily modes (core state)', () => {
    const generatorPoint = getGeneratorPoint();
    const practicePoint = pointMultiply(42n, generatorPoint);
    const dailyPoint = pointMultiply(123n, generatorPoint);

    // Start in practice mode
    store.dispatch(switchGameMode('practice'));

    // Set up practice mode with a challenge
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '2a',
      },
    });

    // Select a specific point in practice mode
    store.dispatch({
      type: 'practiceCalculator/setSelectedPoint',
      payload: practicePoint,
    });

    // Verify practice mode has the selected point
    let state = store.getState();
    expect(state.practiceCalculator.selectedPoint.x).toBe(practicePoint.x);
    expect(state.practiceCalculator.selectedPoint.y).toBe(practicePoint.y);

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));

    // Set up daily challenge
    store.dispatch({
      type: 'dailyCalculator/resetToChallenge',
      payload: '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
    });

    // Select a different point in daily mode
    store.dispatch({
      type: 'dailyCalculator/setSelectedPoint',
      payload: dailyPoint,
    });

    // Verify daily mode has the selected point
    state = store.getState();
    expect(state.dailyCalculator.selectedPoint.x).toBe(dailyPoint.x);
    expect(state.dailyCalculator.selectedPoint.y).toBe(dailyPoint.y);

    // Switch back to practice mode
    store.dispatch(switchGameMode('practice'));

    // Verify practice mode restored its selected point
    state = store.getState();
    expect(state.practiceCalculator.selectedPoint.x).toBe(practicePoint.x);
    expect(state.practiceCalculator.selectedPoint.y).toBe(practicePoint.y);

    // Switch back to daily mode
    store.dispatch(switchGameMode('daily'));

    // Verify daily mode restored its selected point
    state = store.getState();
    expect(state.dailyCalculator.selectedPoint.x).toBe(dailyPoint.x);
    expect(state.dailyCalculator.selectedPoint.y).toBe(dailyPoint.y);
  });

  it('should preserve selected point even when it is not in the graph', () => {
    const generatorPoint = getGeneratorPoint();
    const customPoint = pointMultiply(999n, generatorPoint);

    // Start in practice mode
    store.dispatch(switchGameMode('practice'));

    // Select a custom point that is not in the graph
    store.dispatch({
      type: 'practiceCalculator/setSelectedPoint',
      payload: customPoint,
    });

    // Verify point is selected
    let state = store.getState();
    expect(state.practiceCalculator.selectedPoint.x).toBe(customPoint.x);
    expect(state.practiceCalculator.selectedPoint.y).toBe(customPoint.y);

    // Switch to daily mode and back
    store.dispatch(switchGameMode('daily'));
    store.dispatch(switchGameMode('practice'));

    // Verify the custom point is still selected
    state = store.getState();
    expect(state.practiceCalculator.selectedPoint.x).toBe(customPoint.x);
    expect(state.practiceCalculator.selectedPoint.y).toBe(customPoint.y);
  });
});
