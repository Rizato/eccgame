import { describe, expect, it } from 'vitest';
import { getGeneratorPoint, pointMultiply, pointNegate } from '../../utils/ecc';
import { createTestStore } from '../../utils/testUtils';
import { addOperationToGraph, resetToChallenge } from './eccCalculatorSlice';
import { switchGameMode } from './gameSlice';
import {
  addOperationToGraph as practiceAddOperationToGraph,
  resetToChallengeWithPrivateKey as practiceResetToChallenge,
} from './practiceCalculatorSlice';
import type { RootState } from '../index';

describe('State Persistence with switchGameMode', () => {
  it('should preserve practice state when switching to daily and back', () => {
    // Create a store with all necessary slices
    const store = createTestStore();

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
    const dailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
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
    const store = createTestStore();

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
          type: 'multiply',
          description: 'double edge',
          value: '2',
        },
      })
    );

    let state = store.getState() as RootState;
    const practiceNodeCount = Object.keys(state.practiceCalculator.graph.nodes).length;
    expect(practiceNodeCount).toBe(4); // generator, challenge, doubled node, and negated doubled node

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    state = store.getState() as RootState;
    const dailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
    expect(dailyNodeCount).toBe(2); // only generator and challenge

    // Add nodes in daily mode
    const dailyGeneratorPoint = getGeneratorPoint();
    const negatedPoint = pointNegate(dailyGeneratorPoint);
    store.dispatch(
      addOperationToGraph({
        fromPoint: dailyGeneratorPoint,
        toPoint: negatedPoint,
        operation: {
          type: 'negate',
          description: 'negate point',
          value: '1',
        },
      })
    );

    state = store.getState() as RootState;
    const newDailyNodeCount = Object.keys(state.dailyCalculator.graph.nodes).length;
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
    const dailyNodeIds = Object.keys(state.dailyCalculator.graph.nodes);

    // Graphs should be independent
    expect(practiceNodeIds.length).toBe(4);
    expect(dailyNodeIds.length).toBe(3);
  });
});
