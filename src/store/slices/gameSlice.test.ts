import { describe, expect, it } from 'vitest';
import { OperationType } from '../../types/ecc';
import { getGeneratorPoint, pointMultiply, pointNegate } from '../../utils/ecc';
import { getCachedGraph } from '../../utils/graphCache';
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
    const practiceNodeCount = getCachedGraph('practice').nodes.size;
    const practiceGeneratorId = (store.getState() as RootState).practiceCalculator.generatorNodeId;
    const practiceChallengeId = (store.getState() as RootState).practiceCalculator.challengeNodeId;

    expect(practiceGeneratorId).toBeTruthy();
    expect(practiceChallengeId).toBeTruthy();
    expect(practiceNodeCount).toBeGreaterThan(1);

    // Switch to daily mode - state should be preserved
    store.dispatch(switchGameMode('daily'));

    // Create a challenge in daily mode
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    const dailyNodeCount = getCachedGraph('daily').nodes.size;
    expect(dailyNodeCount).toBeGreaterThan(1);

    // Switch back to practice mode - state should be restored
    store.dispatch(switchGameMode('practice'));

    const restoredPracticeNodeCount = getCachedGraph('practice').nodes.size;
    expect(restoredPracticeNodeCount).toBe(practiceNodeCount);
    expect((store.getState() as RootState).practiceCalculator.generatorNodeId).toBe(
      practiceGeneratorId
    );
    expect((store.getState() as RootState).practiceCalculator.challengeNodeId).toBe(
      practiceChallengeId
    );
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
          type: OperationType.MULTIPLY,
          description: 'double edge',
          value: '2',
        },
      })
    );

    const practiceNodeCount = getCachedGraph('practice').nodes.size;
    expect(practiceNodeCount).toBe(3); // generator, challenge, doubled node (negation might not be automatic in this context)

    // Switch to daily mode
    store.dispatch(switchGameMode('daily'));
    store.dispatch(
      resetToChallenge('03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6')
    );

    const dailyNodeCount = getCachedGraph('daily').nodes.size;
    expect(dailyNodeCount).toBe(2); // only generator and challenge

    // Add nodes in daily mode
    const dailyGeneratorPoint = getGeneratorPoint();
    const negatedPoint = pointNegate(dailyGeneratorPoint);
    store.dispatch(
      addOperationToGraph({
        fromPoint: dailyGeneratorPoint,
        toPoint: negatedPoint,
        operation: {
          type: OperationType.NEGATE,
          description: 'negate point',
          value: '1',
        },
      })
    );

    const newDailyNodeCount = getCachedGraph('daily').nodes.size;
    expect(newDailyNodeCount).toBe(3);

    // Switch back to practice - state should be preserved
    store.dispatch(switchGameMode('practice'));

    const practiceNodeCountAfter = getCachedGraph('practice').nodes.size;
    expect(practiceNodeCountAfter).toBe(practiceNodeCount);

    // Node IDs should be different between modes when they have different challenges
    const practiceNodeIds = Array.from(getCachedGraph('practice').nodes.keys());
    store.dispatch(switchGameMode('daily'));
    const dailyNodeIds = Array.from(getCachedGraph('daily').nodes.keys());

    // Graphs should be independent
    expect(practiceNodeIds.length).toBe(3);
    expect(dailyNodeIds.length).toBe(3);
  });
});
