import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, beforeEach } from 'vitest';
import { OperationType } from '../../types/ecc';
import { getGeneratorPoint, pointMultiply } from '../../utils/ecc';
import { getCachedGraph, clearCachedGraph, addCachedNode } from '../../utils/graphCache';
import dailyCalculatorReducer, {
  addMultipleChallenges,
  addOperationToGraph,
  addBatchOperationsToGraph,
} from './eccCalculatorSlice';
import practiceCalculatorReducer, {
  addOperationToGraph as addPracticeOperationToGraph,
  addBatchOperationsToGraph as addPracticeBatchOperationsToGraph,
  setChallengeWithPrivateKey,
} from './practiceCalculatorSlice';
import type { SingleOperationPayload } from '../../types/ecc';

describe('Multi-Challenge Victory Redux State Tests', () => {
  let store: ReturnType<typeof configureStore>;

  const mockChallenges = [
    {
      publicKey: '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5', // 2G
      tags: ['test1'],
    },
    {
      publicKey: '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9', // 3G
      tags: ['test2'],
    },
    {
      publicKey: '022f01e5e15cca351daff3843fb70f3c2f0a1bdd05e5af888a67784ef3e10a2a01', // 4G
      tags: ['test3'],
    },
  ];

  // Helper function to setup graph with generator node
  const setupGraphWithGenerator = (mode: 'daily' | 'practice') => {
    const generatorPoint = getGeneratorPoint();
    addCachedNode(mode, generatorPoint, {
      id: `${mode}_generator`,
      label: 'Generator (G)',
      privateKey: 1n,
      isGenerator: true,
      connectedToG: true,
    });
  };

  beforeEach(() => {
    // Clear cached graphs to ensure clean state
    clearCachedGraph('daily');
    clearCachedGraph('practice');

    store = configureStore({
      reducer: {
        dailyCalculator: dailyCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: [
              'dailyCalculator/addOperationToGraph',
              'dailyCalculator/addBatchOperationsToGraph',
              'dailyCalculator/addMultipleChallenges',
              'practiceCalculator/addOperationToGraph',
              'practiceCalculator/addBatchOperationsToGraph',
            ],
            ignoredPaths: ['dailyCalculator.selectedPoint', 'practiceCalculator.selectedPoint'],
          },
        }),
    });
  });

  describe('Daily Calculator - Single Operation Victory', () => {
    it('should update state correctly when 2G challenge is solved via single operation', () => {
      // Setup multiple challenges and generator node
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const initialState = store.getState().dailyCalculator;
      expect(initialState.hasWon).toBe(false);
      expect(initialState.solvedChallengeNodeId).toBeNull();

      // Perform operation from generator to 2G challenge
      const generatorPoint = getGeneratorPoint();
      const twoG = pointMultiply(2n, generatorPoint);
      const operation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: twoG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×2',
          value: '2',
          userCreated: true,
        },
      };

      store.dispatch(addOperationToGraph(operation));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBeTruthy();

      // Verify the 2G challenge was identified
      const solvedNodeId = finalState.solvedChallengeNodeId!;
      const challengeMapping = finalState.challengeMapping;
      expect(challengeMapping[solvedNodeId]).toBeDefined();
      expect(challengeMapping[solvedNodeId].publicKey).toBe(mockChallenges[0].publicKey); // 2G challenge
    });

    it('should update state correctly when 3G challenge is solved via single operation', () => {
      // Setup multiple challenges and generator node
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const initialState = store.getState().dailyCalculator;
      expect(initialState.hasWon).toBe(false);

      // Perform operation that results in 3G
      const generatorPoint = getGeneratorPoint();
      const threeG = pointMultiply(3n, generatorPoint);
      const operation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: threeG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×3',
          value: '3',
          userCreated: true,
        },
      };

      store.dispatch(addOperationToGraph(operation));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBeTruthy();

      // Verify the 3G challenge was solved
      const solvedNodeId = finalState.solvedChallengeNodeId!;
      const challengeMapping = finalState.challengeMapping;
      expect(challengeMapping[solvedNodeId].publicKey).toBe(mockChallenges[1].publicKey); // 3G challenge
    });
  });

  describe('Daily Calculator - Batch Operation Victory', () => {
    it('should update state correctly when daily challenge is solved via batch operations', () => {
      // Setup multiple challenges and generator node
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const initialState = store.getState().dailyCalculator;
      expect(initialState.hasWon).toBe(false);

      // Create batch operations that lead to 2G
      const generatorPoint = getGeneratorPoint();
      const batchOperations: SingleOperationPayload[] = [
        {
          fromPoint: generatorPoint,
          toPoint: pointMultiply(4n, generatorPoint),
          operation: {
            type: OperationType.MULTIPLY,
            description: '×4',
            value: '4',
            userCreated: false,
          },
        },
        {
          fromPoint: pointMultiply(4n, generatorPoint),
          toPoint: pointMultiply(2n, generatorPoint),
          operation: {
            type: OperationType.DIVIDE,
            description: '÷2',
            value: '2',
            userCreated: true,
          },
        },
      ];

      store.dispatch(addBatchOperationsToGraph(batchOperations));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBeTruthy();

      // Verify a challenge was solved
      const solvedNodeId = finalState.solvedChallengeNodeId!;
      const challengeMapping = finalState.challengeMapping;
      expect(challengeMapping[solvedNodeId]).toBeDefined();
    });

    it('should update state correctly when extra challenge is solved via batch operations', () => {
      // Setup multiple challenges and generator node
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const initialState = store.getState().dailyCalculator;
      expect(initialState.hasWon).toBe(false);

      // Create batch operations that lead to 3G via 6G->3G (÷2)
      const generatorPoint = getGeneratorPoint();
      const sixG = pointMultiply(6n, generatorPoint);
      const threeG = pointMultiply(3n, generatorPoint);

      const batchOperations: SingleOperationPayload[] = [
        {
          fromPoint: generatorPoint,
          toPoint: sixG,
          operation: {
            type: OperationType.MULTIPLY,
            description: '×6',
            value: '6',
            userCreated: false,
          },
        },
        {
          fromPoint: sixG,
          toPoint: threeG,
          operation: {
            type: OperationType.DIVIDE,
            description: '÷2',
            value: '2',
            userCreated: true,
          },
        },
      ];

      store.dispatch(addBatchOperationsToGraph(batchOperations));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBeTruthy();

      // Verify the 3G challenge was solved
      const solvedNodeId = finalState.solvedChallengeNodeId!;
      const challengeMapping = finalState.challengeMapping;
      expect(challengeMapping[solvedNodeId].publicKey).toBe(mockChallenges[1].publicKey); // 3G challenge
    });
  });

  describe('Practice Calculator - Single Operation Victory', () => {
    it('should update state correctly when practice challenge is solved via single operation', () => {
      // Setup practice challenge (2G with known private key) and generator node
      setupGraphWithGenerator('practice');
      store.dispatch(
        setChallengeWithPrivateKey({
          publicKey: mockChallenges[0].publicKey, // Use 2G challenge
          privateKey: '2',
        })
      );

      const initialState = store.getState().practiceCalculator;
      expect(initialState.hasWon).toBe(false);

      // Perform operation that results in 2G
      const generatorPoint = getGeneratorPoint();
      const twoG = pointMultiply(2n, generatorPoint);
      const operation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: twoG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×2',
          value: '2',
          userCreated: true,
        },
      };

      store.dispatch(addPracticeOperationToGraph(operation));

      const finalState = store.getState().practiceCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);

      // Verify the graph has connected challenge nodes
      const practiceGraph = getCachedGraph('practice');
      expect(practiceGraph.connectedChallengeNodes.size).toBeGreaterThan(0);
    });
  });

  describe('Practice Calculator - Batch Operation Victory', () => {
    it('should update state correctly when practice challenge is solved via batch operations', () => {
      // Setup practice challenge (3G with known private key) and generator node
      setupGraphWithGenerator('practice');
      store.dispatch(
        setChallengeWithPrivateKey({
          publicKey: mockChallenges[1].publicKey, // Use 3G challenge
          privateKey: '3',
        })
      );

      const initialState = store.getState().practiceCalculator;
      expect(initialState.hasWon).toBe(false);

      // Create batch operations that lead to 3G
      const generatorPoint = getGeneratorPoint();
      const twoG = pointMultiply(2n, generatorPoint);
      const threeG = pointMultiply(3n, generatorPoint);

      const batchOperations: SingleOperationPayload[] = [
        {
          fromPoint: generatorPoint,
          toPoint: twoG,
          operation: {
            type: OperationType.MULTIPLY,
            description: '×2',
            value: '2',
            userCreated: false,
          },
        },
        {
          fromPoint: twoG,
          toPoint: threeG,
          operation: {
            type: OperationType.ADD,
            description: '+G',
            value: '1',
            userCreated: true,
          },
        },
      ];

      store.dispatch(addPracticeBatchOperationsToGraph(batchOperations));

      const finalState = store.getState().practiceCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);

      // Verify the graph has connected challenge nodes
      const practiceGraph = getCachedGraph('practice');
      expect(practiceGraph.connectedChallengeNodes.size).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should not trigger victory when no challenges are connected', () => {
      // Setup challenges and generator node but don't perform operations that connect them
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const initialState = store.getState().dailyCalculator;
      expect(initialState.hasWon).toBe(false);

      // Perform operation that doesn't connect to any challenge (5G)
      const generatorPoint = getGeneratorPoint();
      const fiveG = pointMultiply(5n, generatorPoint);
      const operation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: fiveG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×5',
          value: '5',
          userCreated: true,
        },
      };

      store.dispatch(addOperationToGraph(operation));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(false);
      expect(finalState.showVictoryModal).toBe(false);
      expect(finalState.solvedChallengeNodeId).toBeNull();
    });

    it('should handle multiple challenges connecting in single batch', () => {
      // Setup challenges and generator node
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      // Create batch that connects multiple challenges at once
      const generatorPoint = getGeneratorPoint();
      const batchOperations: SingleOperationPayload[] = [
        {
          fromPoint: generatorPoint,
          toPoint: generatorPoint,
          operation: {
            type: OperationType.MULTIPLY,
            description: '×1',
            value: '1',
            userCreated: true,
          },
        },
        {
          fromPoint: generatorPoint,
          toPoint: pointMultiply(2n, generatorPoint),
          operation: {
            type: OperationType.MULTIPLY,
            description: '×2',
            value: '2',
            userCreated: true,
          },
        },
      ];

      store.dispatch(addBatchOperationsToGraph(batchOperations));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.showVictoryModal).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBeTruthy();

      // Should track the first connected challenge
      const solvedNodeId = finalState.solvedChallengeNodeId!;
      const challengeMapping = finalState.challengeMapping;
      expect(challengeMapping[solvedNodeId]).toBeDefined();
    });

    it('should maintain state after victory is achieved', () => {
      // Setup and solve a challenge
      store.dispatch(addMultipleChallenges(mockChallenges));
      setupGraphWithGenerator('daily');

      const generatorPoint = getGeneratorPoint();
      const twoG = pointMultiply(2n, generatorPoint);
      const operation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: twoG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×2',
          value: '2',
          userCreated: true,
        },
      };

      store.dispatch(addOperationToGraph(operation));

      const firstVictoryState = store.getState().dailyCalculator;
      expect(firstVictoryState.hasWon).toBe(true);
      const firstSolvedNodeId = firstVictoryState.solvedChallengeNodeId;

      // Perform another operation - should not change the solved challenge
      const fourG = pointMultiply(4n, generatorPoint);
      const anotherOperation: SingleOperationPayload = {
        fromPoint: generatorPoint,
        toPoint: fourG,
        operation: {
          type: OperationType.MULTIPLY,
          description: '×4',
          value: '4',
          userCreated: true,
        },
      };

      store.dispatch(addOperationToGraph(anotherOperation));

      const finalState = store.getState().dailyCalculator;
      expect(finalState.hasWon).toBe(true);
      expect(finalState.solvedChallengeNodeId).toBe(firstSolvedNodeId);
    });
  });
});
