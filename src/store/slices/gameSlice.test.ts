import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import {
  getGeneratorPoint,
  pointAdd,
  pointMultiply,
  pointNegate,
  hexToBigint,
} from '../../utils/ecc';
import type { ChallengeData } from '../../types/game';
import type { RootState } from '../store';
import eccCalculatorReducer, {
  addOperationToGraph,
  checkWinCondition,
  resetToChallenge,
} from './eccCalculatorSlice';
import gameReducer, {
  setGameMode,
  setError,
  setHasWon,
  clearError,
  resetGame,
  switchGameMode,
  type GameMode,
} from './gameSlice';
import practiceCalculatorReducer, {
  addOperationToGraph as practiceAddOperationToGraph,
  checkWinCondition as practiceCheckWinCondition,
  resetToChallengeWithPrivateKey as practiceResetToChallenge,
} from './practiceCalculatorSlice';

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

describe('State Bleed Between Practice and Daily Modes', () => {
  it('should not allow win in daily mode using practice mode challenge', () => {
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
              'eccCalculator/clearGraph',
              'practiceCalculator/clearGraph',
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
    const privateScalar = hexToBigint(privateKey);

    // Create a challenge in practice mode with test data
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: privateKey,
      })
    );

    // Get the practice mode state
    let state = store.getState() as RootState;
    const practiceGeneratorId = state.practiceCalculator.generatorNodeId;
    const practiceChallengeId = state.practiceCalculator.challengeNodeId;

    expect(practiceGeneratorId).toBeTruthy();
    expect(practiceChallengeId).toBeTruthy();

    // Get generator point
    const generatorPoint = getGeneratorPoint();
    const doubledPoint = pointMultiply(2n, generatorPoint);

    // Create an intermediate node in practice mode
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

    state = store.getState() as RootState;
    const practiceIntermediateId = Object.keys(state.practiceCalculator.graph.nodes).find(
      id => id !== practiceGeneratorId && id !== practiceChallengeId
    );

    expect(practiceIntermediateId).toBeTruthy();

    // Get the challenge point to connect to
    const challengeNode = state.practiceCalculator.graph.nodes[practiceChallengeId!];
    const challengePoint = challengeNode.point;

    // Connect intermediate to challenge in practice mode
    const sumPoint = pointAdd(doubledPoint, challengePoint);
    store.dispatch(
      practiceAddOperationToGraph({
        fromPoint: doubledPoint,
        toPoint: sumPoint,
        operation: {
          id: 'test',
          type: 'add',
          description: 'Add scalar',
          value: (privateScalar - 1n).toString(),
        },
      })
    );

    // Check win condition in practice mode - should win
    store.dispatch(practiceCheckWinCondition());
    state = store.getState() as RootState;
    expect(state.practiceCalculator.hasWon).toBe(true);

    // Switch to daily mode - this should clear both calculator states
    store.dispatch(switchGameMode('daily'));

    // Create a challenge in daily mode
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyGeneratorId = state.eccCalculator.generatorNodeId;
    const dailyChallengeId = state.eccCalculator.challengeNodeId;

    expect(dailyGeneratorId).toBeTruthy();
    expect(dailyChallengeId).toBeTruthy();

    // The bug: Try to connect daily generator to practice challenge
    // This should not be possible or should not trigger a win
    const dailyGraph = state.eccCalculator.graph;
    const practiceGraph = state.practiceCalculator.graph;

    // Verify that the challenges are separate
    expect(dailyChallengeId).not.toBe(practiceChallengeId);

    // The daily challenge should not have connectedToG yet
    const dailyChallengeNode = dailyGraph.nodes[dailyChallengeId!];
    expect(dailyChallengeNode?.connectedToG).toBeFalsy();

    // Daily mode should not have won yet
    expect(state.eccCalculator.hasWon).toBe(false);

    // Get points for the edge creation
    const dailyGeneratorNode = dailyGraph.nodes[dailyGeneratorId!];
    const dailyGeneratorPoint = dailyGeneratorNode.point;

    // Try to create edge from daily generator to daily challenge
    const dailySumPoint = pointMultiply(privateScalar, dailyGeneratorPoint);
    store.dispatch(
      addOperationToGraph({
        fromPoint: dailyGeneratorPoint,
        toPoint: dailySumPoint,
        operation: {
          id: 'test',
          type: 'multiply',
          description: 'double edge',
          value: privateScalar.toString(),
        },
      })
    );

    // Check win condition - should win in daily mode with daily challenge
    store.dispatch(checkWinCondition());
    state = store.getState() as RootState;
    expect(state.eccCalculator.hasWon).toBe(true);

    // Reset game and verify states are clean
    store.dispatch(resetGame());
    state = store.getState() as RootState;

    // After reset, both modes should not have won
    expect(state.eccCalculator.hasWon).toBe(false);
    expect(state.practiceCalculator.hasWon).toBe(false);
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
              'eccCalculator/clearGraph',
              'practiceCalculator/clearGraph',
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

    // Practice mode should still have its original nodes
    const practiceNodeCountAfter = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCountAfter).toBe(practiceNodeCount);

    // Node IDs should be different between modes
    const practiceNodeIds = Object.keys(state.practiceCalculator.graph.nodes);
    const dailyNodeIds = Object.keys(state.eccCalculator.graph.nodes);

    const commonIds = practiceNodeIds.filter(id => dailyNodeIds.includes(id));
    expect(commonIds.length).toBe(0); // No shared node IDs
  });

  it('should not propagate connectedToG between modes', () => {
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
              'eccCalculator/clearGraph',
              'practiceCalculator/clearGraph',
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

    // Create winning state in practice mode
    store.dispatch(switchGameMode('practice'));
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '123456789abcdef',
      })
    );

    let state = store.getState() as RootState;
    const practiceGeneratorId = state.practiceCalculator.generatorNodeId!;
    const practiceChallengeId = state.practiceCalculator.challengeNodeId!;

    // Get points for connection
    const practiceGeneratorNode = state.practiceCalculator.graph.nodes[practiceGeneratorId];
    const practiceGeneratorPoint = practiceGeneratorNode.point;
    const practiceChallengeNode = state.practiceCalculator.graph.nodes[practiceChallengeId];
    const practiceChallengePoint = practiceChallengeNode.point;

    const privateKey = '123456789abcdef';
    const privateScalar = hexToBigint(privateKey);

    // Connect directly for a win
    const practiceSumPoint = pointMultiply(privateScalar, practiceGeneratorPoint);
    store.dispatch(
      practiceAddOperationToGraph({
        fromPoint: practiceGeneratorPoint,
        toPoint: practiceSumPoint,
        operation: {
          id: 'test',
          type: 'multiply',
          description: 'multiply by private key',
          value: privateScalar.toString(),
        },
      })
    );

    store.dispatch(practiceCheckWinCondition());
    state = store.getState() as RootState;
    expect(state.practiceCalculator.hasWon).toBe(true);

    // Verify challenge has connectedToG in practice mode
    const practiceChallengeNodeAfterWin = state.practiceCalculator.graph.nodes[practiceChallengeId];
    expect(practiceChallengeNodeAfterWin?.connectedToG).toBe(true);

    // Switch to daily mode and create new challenge
    store.dispatch(switchGameMode('daily'));
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyChallengeId = state.eccCalculator.challengeNodeId!;

    // Daily challenge should not have connectedToG from practice mode
    const dailyChallengeNode = state.eccCalculator.graph.nodes[dailyChallengeId];
    expect(dailyChallengeNode?.connectedToG).toBeFalsy();

    // Daily mode should not have won
    expect(state.eccCalculator.hasWon).toBe(false);
  });
});
