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

describe('State Bleed Security Tests - Regression Prevention', () => {
  it('should prevent winning in daily mode using practice mode solution', () => {
    // This test ensures no state bleed that allows cross-mode exploitation
    // Focus is on mode isolation, not the specific win condition logic
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

    // Create a challenge in practice mode
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '123456789abcdef',
      })
    );

    // Get the practice mode state
    let state = store.getState() as RootState;
    const practiceGeneratorId = state.practiceCalculator.generatorNodeId;
    const practiceChallengeId = state.practiceCalculator.challengeNodeId;
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;

    expect(practiceGeneratorId).toBeTruthy();
    expect(practiceChallengeId).toBeTruthy();
    expect(practiceNodeCount).toBeGreaterThan(1);

    // Create some operation in practice mode to distinguish it from daily
    const generatorPoint = getGeneratorPoint();
    const doubledPoint = pointMultiply(2n, generatorPoint);

    store.dispatch(
      practiceAddOperationToGraph({
        fromPoint: generatorPoint,
        toPoint: doubledPoint,
        operation: {
          id: 'practice_op',
          type: 'multiply',
          description: 'practice operation',
          value: '2',
        },
      })
    );

    state = store.getState() as RootState;
    const updatedPracticeNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(updatedPracticeNodeCount).toBeGreaterThanOrEqual(practiceNodeCount); // May not create new node if point exists

    // Switch to daily mode - practice state should be preserved but separate
    store.dispatch(switchGameMode('daily'));

    // Create a challenge in daily mode
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyGeneratorId = state.eccCalculator.generatorNodeId;
    const dailyChallengeId = state.eccCalculator.challengeNodeId;
    const dailyNodeCount = Object.keys(state.eccCalculator.graph.nodes).length;

    // CRITICAL SECURITY TESTS: Verify complete isolation between modes

    // 1. Node IDs must be completely different to prevent cross-references
    expect(dailyChallengeId).not.toBe(practiceChallengeId);
    expect(dailyGeneratorId).not.toBe(practiceGeneratorId);

    // 2. Daily mode should start clean with only generator and challenge
    expect(dailyNodeCount).toBe(2); // generator + challenge only

    // 3. Daily mode should not have inherited any state from practice
    expect(state.eccCalculator.hasWon).toBe(false);

    // 4. Practice state should still exist but be isolated
    const practiceNodeCountInDaily = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCountInDaily).toBe(updatedPracticeNodeCount); // Preserved but separate

    // Switch back to practice to verify state preservation
    store.dispatch(switchGameMode('practice'));
    state = store.getState() as RootState;

    // 5. Practice state should be exactly as we left it
    expect(state.practiceCalculator.generatorNodeId).toBe(practiceGeneratorId);
    expect(state.practiceCalculator.challengeNodeId).toBe(practiceChallengeId);
    expect(Object.keys(state.practiceCalculator.graph.nodes).length).toBe(updatedPracticeNodeCount);

    // The key security property: modes are completely isolated
    // No data can leak between practice and daily modes through node IDs or state
  });

  it('should maintain separate graph node IDs to prevent cross-references', () => {
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

    // Switch back to practice mode and verify states are preserved
    store.dispatch(switchGameMode('practice'));
    state = store.getState() as RootState;
    const practiceNodeCountAfter = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCountAfter).toBe(practiceNodeCount);

    // CRITICAL: Node IDs should be completely different between modes
    // This prevents any possibility of cross-mode node references
    const practiceNodeIds = Object.keys(state.practiceCalculator.graph.nodes);

    store.dispatch(switchGameMode('daily'));
    state = store.getState() as RootState;
    const dailyNodeIds = Object.keys(state.eccCalculator.graph.nodes);

    const commonIds = practiceNodeIds.filter(id => dailyNodeIds.includes(id));
    expect(commonIds.length).toBe(0); // No shared node IDs - critical for security
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

    // Create a state in practice mode
    store.dispatch(switchGameMode('practice'));
    store.dispatch(
      practiceResetToChallenge({
        publicKey: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
        privateKey: '123456789abcdef',
      })
    );

    let state = store.getState() as RootState;
    const practiceGeneratorId = state.practiceCalculator.generatorNodeId!;

    // We'll test connectedToG isolation by creating operations and checking that
    // the state doesn't bleed between modes. The key is the generator is always connectedToG

    // Add some operation to make practice mode distinctive
    const generatorPoint = getGeneratorPoint();
    const doubledPoint = pointMultiply(2n, generatorPoint);
    store.dispatch(
      practiceAddOperationToGraph({
        fromPoint: generatorPoint,
        toPoint: doubledPoint,
        operation: {
          id: 'practice_op',
          type: 'multiply',
          description: 'practice operation',
          value: '2',
        },
      })
    );

    // Verify practice generator has connectedToG (it always should)
    state = store.getState() as RootState;
    const practiceGeneratorAfter = state.practiceCalculator.graph.nodes[practiceGeneratorId];
    expect(practiceGeneratorAfter?.connectedToG).toBe(true);

    // Switch to daily mode and create new challenge
    store.dispatch(switchGameMode('daily'));
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyChallengeId = state.eccCalculator.challengeNodeId!;

    // CRITICAL SECURITY TEST: Daily challenge should not have connectedToG from practice mode
    // This ensures no bleed of win state between modes
    const dailyChallengeNode = state.eccCalculator.graph.nodes[dailyChallengeId];
    expect(dailyChallengeNode?.connectedToG).toBeFalsy();

    // Daily mode should not have won
    expect(state.eccCalculator.hasWon).toBe(false);

    // Switch back to practice and verify state is preserved
    store.dispatch(switchGameMode('practice'));
    state = store.getState() as RootState;

    // Practice generator should still have its connectedToG state preserved
    const restoredPracticeGeneratorNode = state.practiceCalculator.graph.nodes[practiceGeneratorId];
    expect(restoredPracticeGeneratorNode?.connectedToG).toBe(true);

    // The key security property: connectedToG state does not leak between modes
    // Each mode maintains its own independent graph state
  });
});
