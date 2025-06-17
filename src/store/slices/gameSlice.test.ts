import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { getGeneratorPoint, pointMultiply, pointNegate } from '../../utils/ecc';
import eccCalculatorReducer, { addOperationToGraph, resetToChallenge } from './eccCalculatorSlice';
import gameReducer, {
  setGameMode,
  setError,
  setHasWon,
  clearError,
  switchGameMode,
  type GameMode,
} from './gameSlice';
import practiceCalculatorReducer, {
  addOperationToGraph as practiceAddOperationToGraph,
  resetToChallengeWithPrivateKey as practiceResetToChallenge,
} from './practiceCalculatorSlice';
import type { ChallengeData } from '../../types/game';
import type { RootState } from '../store';

describe('gameSlice', () => {
  // Create test challenge data (without p2pkh_address)
  const testChallengeData: ChallengeData[] = [
    {
      public_key: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
      tags: ['test', 'challenge1'],
    },
    {
      public_key: '0296b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52',
      tags: ['test', 'challenge2'],
    },
    {
      public_key: '0311db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5c',
      tags: ['test', 'challenge3'],
    },
  ];

  const initialState = {
    gameMode: 'daily' as GameMode,
    challenge: null,
    loading: false,
    error: null,
    hasWon: false,
    gaveUp: false,
    challenges: testChallengeData,
  };

  it('should handle setGameMode', () => {
    const actual = gameReducer(initialState, setGameMode('practice'));
    expect(actual.gameMode).toEqual('practice');
  });

  it('should handle setError', () => {
    const actual = gameReducer(initialState, setError('Test error'));
    expect(actual.error).toEqual('Test error');
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = gameReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle setHasWon', () => {
    const actual = gameReducer(initialState, setHasWon(true));
    expect(actual.hasWon).toBe(true);
  });
});

describe('State Persistence with switchGameMode', () => {
  it('should preserve practice state when switching to daily and back', () => {
    // Create a store with all necessary slices
    const store = configureStore({
      reducer: {
        game: gameReducer,
        eccCalculator: eccCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore BigInt values in ECC points for testing
            ignoredActions: [
              'eccCalculator/addOperationToGraph',
              'practiceCalculator/addOperationToGraph',
              'eccCalculator/saveState',
              'practiceCalculator/saveState',
              'eccCalculator/loadState',
              'practiceCalculator/loadState',
            ],
            ignoredPaths: [
              'eccCalculator.selectedPoint',
              'eccCalculator.graph',
              'practiceCalculator.selectedPoint',
              'practiceCalculator.graph',
            ],
          },
        }),
    });

    // Start in practice mode
    store.dispatch(switchGameMode('practice'));
    const privateKey = '123456789abcdef';

    // Create a challenge in practice mode with test data
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: privateKey,
      })
    );

    // Get the practice mode state
    let state = store.getState() as RootState;
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    const practiceGeneratorId = state.practiceCalculator.generatorNodeId;
    const practiceChallengeId = state.practiceCalculator.challengeNodeId;

    expect(practiceGeneratorId).toBeTruthy();
    expect(practiceChallengeId).toBeTruthy();
    expect(practiceNodeCount).toBeGreaterThan(1);

    // Switch to daily mode - state should be preserved
    store.dispatch(switchGameMode('daily'));

    // Create a challenge in daily mode
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyNodeCount = Object.keys(state.eccCalculator.graph.nodes).length;
    expect(dailyNodeCount).toBeGreaterThan(1);

    // Switch back to practice mode - state should be restored
    store.dispatch(switchGameMode('practice'));

    state = store.getState() as RootState;
    const restoredPracticeNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(restoredPracticeNodeCount).toBe(practiceNodeCount);
    expect(state.practiceCalculator.generatorNodeId).toBe(practiceGeneratorId);
    expect(state.practiceCalculator.challengeNodeId).toBe(practiceChallengeId);
  });

  it('should maintain separate graph states between modes', () => {
    const store = configureStore({
      reducer: {
        game: gameReducer,
        eccCalculator: eccCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            // Ignore BigInt values in ECC points for testing
            ignoredActions: [
              'eccCalculator/addOperationToGraph',
              'practiceCalculator/addOperationToGraph',
              'eccCalculator/saveState',
              'practiceCalculator/saveState',
              'eccCalculator/loadState',
              'practiceCalculator/loadState',
            ],
            ignoredPaths: [
              'eccCalculator.selectedPoint',
              'eccCalculator.graph',
              'practiceCalculator.selectedPoint',
              'practiceCalculator.graph',
            ],
          },
        }),
    });

    // Start in practice mode and create nodes
    store.dispatch(switchGameMode('practice'));
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '123456789abcdef',
      })
    );

    // Create a node from generator
    const generatorPoint = getGeneratorPoint();
    const doubledPoint = pointMultiply(2n, generatorPoint);
    store.dispatch(
      practiceAddOperationToGraph({
        fromPoint: generatorPoint,
        toPoint: doubledPoint,
        operation: {
          id: 'test',
          type: 'multiply',
          description: 'double edge',
          value: '2',
        },
      })
    );

    let state = store.getState() as RootState;
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCount).toBe(3); // generator, challenge, and new node

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyNodeCount = Object.keys(state.eccCalculator.graph.nodes).length;
    expect(dailyNodeCount).toBe(2); // only generator and challenge

    // Add nodes in daily mode
    const dailyGeneratorPoint = getGeneratorPoint();
    const negatedPoint = pointNegate(dailyGeneratorPoint);
    store.dispatch(
      addOperationToGraph({
        fromPoint: dailyGeneratorPoint,
        toPoint: negatedPoint,
        operation: {
          id: 'test',
          type: 'negate',
          description: 'negate point',
          value: '1',
        },
      })
    );

    state = store.getState() as RootState;
    const newDailyNodeCount = Object.keys(state.eccCalculator.graph.nodes).length;
    expect(newDailyNodeCount).toBe(3);

    // Switch back to practice - state should be preserved
    store.dispatch(switchGameMode('practice'));
    state = store.getState() as RootState;
    const practiceNodeCountAfter = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCountAfter).toBe(practiceNodeCount);

    // Node IDs should be different between modes when they have different challenges
    const practiceNodeIds = Object.keys(state.practiceCalculator.graph.nodes);
    store.dispatch(switchGameMode('daily'));
    state = store.getState() as RootState;
    const dailyNodeIds = Object.keys(state.eccCalculator.graph.nodes);

    // Graphs should be independent
    expect(practiceNodeIds.length).toBe(3);
    expect(dailyNodeIds.length).toBe(3);
  });
});
