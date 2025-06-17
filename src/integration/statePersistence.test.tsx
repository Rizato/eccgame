import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach } from 'vitest';
import eccCalculatorReducer from '../store/slices/eccCalculatorSlice';
import gameReducer, { switchGameMode } from '../store/slices/gameSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';
import { getGeneratorPoint, pointMultiply } from '../utils/ecc';
import { clearDailyState, clearPracticeState } from '../utils/storage';

describe('State Persistence Integration Tests', () => {
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

  it('should maintain separate state for practice and daily modes', () => {
    // Start in practice mode
    store.dispatch(switchGameMode('practice'));

    const generatorPoint = getGeneratorPoint();
    const challengePoint = pointMultiply(42n, generatorPoint);

    // Set up practice mode with a challenge
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '123456789abcdef',
      },
    });

    // Add operation to practice graph
    store.dispatch({
      type: 'practiceCalculator/addOperationToGraph',
      payload: {
        fromPoint: generatorPoint,
        toPoint: challengePoint,
        operation: {
          id: 'practice-op',
          type: 'multiply',
          description: 'Practice multiply',
          value: '42',
        },
      },
    });

    // Verify practice mode has custom state
    let state = store.getState();
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCount).toBeGreaterThan(2);
    expect(state.practiceCalculator.challengeNodeId).toBeTruthy();

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));

    // Set up daily challenge
    store.dispatch({
      type: 'dailyCalculator/resetToChallenge',
      payload: '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
    });

    // Add different operation to daily graph
    const dailyChallengePoint = pointMultiply(123n, generatorPoint);
    store.dispatch({
      type: 'dailyCalculator/addOperationToGraph',
      payload: {
        fromPoint: generatorPoint,
        toPoint: dailyChallengePoint,
        operation: {
          id: 'daily-op',
          type: 'multiply',
          description: 'Daily multiply',
          value: '123',
        },
      },
    });

    // Verify daily mode has its own state
    state = store.getState();
    const dailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
    expect(dailyNodeCount).toBeGreaterThan(2);
    expect(state.dailyCalculator.challengeNodeId).toBeTruthy();

    // Switch back to practice mode
    store.dispatch(switchGameMode('practice'));

    // Verify practice mode preserved its state
    state = store.getState();
    const practiceNodeCountAfter = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCountAfter).toBe(practiceNodeCount); // Same as before
    expect(state.practiceCalculator.challengeNodeId).toBeTruthy();

    // Switch back to daily to verify its state is preserved too
    store.dispatch(switchGameMode('daily'));

    state = store.getState();
    const finalDailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
    expect(finalDailyNodeCount).toBeGreaterThan(2); // Should restore daily state
    expect(state.dailyCalculator.challengeNodeId).toBeTruthy();
  });

  it('should not bleed state between modes', () => {
    // Start in practice mode and build a specific graph
    store.dispatch(switchGameMode('practice'));

    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '2a',
      },
    });

    let state = store.getState();
    const practiceChallenge =
      state.practiceCalculator.graph.nodes[state.practiceCalculator.challengeNodeId!];

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));

    // Set up different daily challenge
    store.dispatch({
      type: 'dailyCalculator/resetToChallenge',
      payload: '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
    });

    state = store.getState();
    const dailyChallenge =
      state.dailyCalculator.graph.nodes[state.dailyCalculator.challengeNodeId!];

    // Verify challenges are different (no bleed)
    expect(practiceChallenge.point.x).not.toBe(dailyChallenge.point.x);
    expect(practiceChallenge.point.y).not.toBe(dailyChallenge.point.y);

    // Verify practice state doesn't affect daily
    expect(state.dailyCalculator.hasWon).toBe(false);
    expect(state.practiceCalculator.hasWon).toBe(false);
  });

  it('should clear individual mode states when requested', () => {
    // Set up practice mode with data
    store.dispatch(switchGameMode('practice'));
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '2a',
      },
    });

    // Verify practice has data
    let state = store.getState();
    expect(Object.keys(state.practiceCalculator.graph.nodes).length).toBeGreaterThan(1);

    // Set up daily mode with data
    store.dispatch(switchGameMode('daily'));
    store.dispatch({
      type: 'dailyCalculator/resetToChallenge',
      payload: '02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
    });

    // Verify daily has data
    state = store.getState();
    expect(Object.keys(state.dailyCalculator.graph.nodes).length).toBeGreaterThan(1);

    // Now clear practice state using the clear action while in daily mode
    store.dispatch({ type: 'practiceCalculator/clearGraph' });

    // Switch to practice and verify it's cleared
    store.dispatch(switchGameMode('practice'));
    state = store.getState();
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCount).toBe(1); // Only generator

    // But daily should still have its state
    store.dispatch(switchGameMode('daily'));
    state = store.getState();
    const dailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
    expect(dailyNodeCount).toBeGreaterThan(1); // Still has challenge
  });
});
