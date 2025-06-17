import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import gameReducer, { switchGameMode } from '../store/slices/gameSlice';
import eccCalculatorReducer from '../store/slices/eccCalculatorSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';
import { getGeneratorPoint, pointMultiply } from '../utils/ecc';

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
              'dailyCalculator/clearGraph',
              'practiceCalculator/clearGraph',
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

  it('should prevent state bleed when switching from practice to daily mode', () => {
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

    // Build a graph that could win
    store.dispatch({
      type: 'practiceCalculator/addOperationToGraph',
      payload: {
        fromPoint: generatorPoint,
        toPoint: challengePoint,
        operation: {
          id: 'test-op',
          type: 'multiply',
          description: 'Test multiply',
          value: '42',
        },
      },
    });

    // Verify practice mode has a graph with nodes
    let state = store.getState();
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCount).toBeGreaterThan(2);

    // Switch to daily mode using the fixed switchGameMode
    store.dispatch(switchGameMode('daily'));

    // Verify that both modes have clean states after switch
    state = store.getState();
    const dailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
    const practiceNodeCountAfter = Object.keys(state.practiceCalculator.graph.nodes).length;

    // Both should only have generator node (clean state)
    expect(dailyNodeCount).toBe(1);
    expect(practiceNodeCountAfter).toBe(1);

    // Neither mode should have won status
    expect(state.dailyCalculator.hasWon).toBe(false);
    expect(state.practiceCalculator.hasWon).toBe(false);

    // No challenge nodes should exist
    expect(state.dailyCalculator.challengeNodeId).toBeNull();
    expect(state.practiceCalculator.challengeNodeId).toBeNull();
  });

  it('should prevent cross-mode victory exploitation', () => {
    // Start in practice mode
    store.dispatch(switchGameMode('practice'));

    // Set up practice mode with a winnable scenario
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '2a',
      },
    });

    let state = store.getState();
    const practiceChallengeId = state.practiceCalculator.challengeNodeId;

    // Create connection that should win in practice
    const generatorPoint = getGeneratorPoint();
    const practiceChallenge = state.practiceCalculator.graph.nodes[practiceChallengeId!];

    store.dispatch({
      type: 'practiceCalculator/addOperationToGraph',
      payload: {
        fromPoint: generatorPoint,
        toPoint: practiceChallenge.point,
        operation: {
          id: 'exploit-op',
          type: 'multiply',
          description: 'Exploit multiply',
          value: '42',
        },
      },
    });

    // Switch to daily mode - this should clear everything
    store.dispatch(switchGameMode('daily'));

    // Set up daily challenge
    store.dispatch({
      type: 'dailyCalculator/resetToChallenge',
      payload: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
    });

    state = store.getState();
    const dailyChallengeId = state.dailyCalculator.challengeNodeId;

    // Both challenges will have the same ID if using same public key, but they should be in separate graph states
    // The key point is that the graphs are isolated, not that the IDs are different
    expect(dailyChallengeId).toBeTruthy();
    expect(practiceChallengeId).toBeTruthy();

    // Try the exploit: connect daily generator to daily challenge
    const dailyGenerator =
      state.dailyCalculator.graph.nodes[state.dailyCalculator.generatorNodeId!];
    const dailyChallenge = state.dailyCalculator.graph.nodes[dailyChallengeId!];

    store.dispatch({
      type: 'dailyCalculator/addOperationToGraph',
      payload: {
        fromPoint: dailyGenerator.point,
        toPoint: dailyChallenge.point,
        operation: {
          id: 'attempt-exploit',
          type: 'multiply',
          description: 'Attempt exploit',
          value: '42',
        },
      },
    });

    // Check win condition
    store.dispatch({ type: 'dailyCalculator/checkWinCondition' });

    state = store.getState();

    // Daily mode should win legitimately with its own challenge
    expect(state.dailyCalculator.hasWon).toBe(true);

    // Practice mode should not be affected
    expect(state.practiceCalculator.hasWon).toBe(false);

    // The victory should be legitimate, not due to state bleed
    const finalDailyChallenge = state.dailyCalculator.graph.nodes[dailyChallengeId!];
    expect(finalDailyChallenge?.connectedToG).toBe(true);
  });

  it('should demonstrate the original bug without switchGameMode', () => {
    // This test shows what would happen with the old setGameMode
    // Start in practice mode
    store.dispatch({ type: 'game/setGameMode', payload: 'practice' });

    // Set up practice mode with a challenge
    store.dispatch({
      type: 'practiceCalculator/resetToChallengeWithPrivateKey',
      payload: {
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '2a',
      },
    });

    // Create a winning connection in practice
    const generatorPoint = getGeneratorPoint();
    let state = store.getState();
    const practiceChallenge =
      state.practiceCalculator.graph.nodes[state.practiceCalculator.challengeNodeId!];

    store.dispatch({
      type: 'practiceCalculator/addOperationToGraph',
      payload: {
        fromPoint: generatorPoint,
        toPoint: practiceChallenge.point,
        operation: {
          id: 'practice-win',
          type: 'multiply',
          description: 'Practice win',
          value: '42',
        },
      },
    });

    // Check practice win
    store.dispatch({ type: 'practiceCalculator/checkWinCondition' });
    state = store.getState();
    expect(state.practiceCalculator.hasWon).toBe(true);

    // Switch to daily using old method (just setGameMode, no clearing)
    store.dispatch({ type: 'game/setGameMode', payload: 'daily' });

    // The practice state should still exist (demonstrating the bug)
    state = store.getState();
    const practiceNodeCountAfterOldSwitch = Object.keys(
      state.practiceCalculator.graph.nodes
    ).length;
    expect(practiceNodeCountAfterOldSwitch).toBeGreaterThan(1); // State persists
    expect(state.practiceCalculator.hasWon).toBe(true); // Win state persists

    // This shows the state bleed that should be prevented
  });
});
