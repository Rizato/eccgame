import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGeneratorPoint, pointMultiply, pointNegate, pointToPublicKey } from '../../utils/ecc';
import dailyCalculatorReducer, {
  addOperationToGraph,
  resetToGenerator,
  setChallengePublicKey,
} from './eccCalculatorSlice';
import type { Operation, GraphNode, GraphEdge } from '../../types/ecc';

describe('DailyCalculatorSlice Force Multiplication', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        dailyCalculator: dailyCalculatorReducer,
      },
    });

    // Reset to generator to get clean initial state
    store.dispatch(resetToGenerator());
  });

  describe('Automatic Negation', () => {
    it('should add negated node when adding any operation', () => {
      const fromPoint = getGeneratorPoint();
      const toPoint = pointMultiply(3n, fromPoint); // 3G
      const operation: Operation = {
        type: 'multiply',
        description: '×3',
        value: '3',
        userCreated: true,
      };

      store.dispatch(
        addOperationToGraph({
          fromPoint,
          toPoint,
          operation,
        })
      );

      const state = (store.getState() as any).dailyCalculator;

      // Should have nodes for fromPoint, toPoint, and negated toPoint
      const nodes = Object.values(state.graph.nodes) as GraphNode[];
      expect(nodes).toHaveLength(3); // G, 3G, -3G

      // Check that negated point exists
      const negatedPoint = pointNegate(toPoint);
      const negatedNode = nodes.find(
        node => node.point.x === negatedPoint.x && node.point.y === negatedPoint.y
      );
      expect(negatedNode).toBeDefined();

      // Should have edges: G -> 3G (multiply) and 3G -> -3G (negate)
      const edges = Object.values(state.graph.edges) as GraphEdge[];
      expect(edges).toHaveLength(2);

      const negateEdge = edges.find(edge => edge.operation.type === 'negate');
      expect(negateEdge).toBeDefined();
      expect(negateEdge?.operation.userCreated).toBe(false);
    });

    it('should add negated challenge point when challenge is set', () => {
      const challengePrivateKey = 7n;
      const challengePoint = pointMultiply(challengePrivateKey, getGeneratorPoint());
      const challengePublicKey = pointToPublicKey(challengePoint);

      // Set challenge which should add challenge point to graph
      store.dispatch(setChallengePublicKey(challengePublicKey));

      // Now add an operation to the challenge point
      const resultPoint = pointMultiply(2n, challengePoint);
      store.dispatch(
        addOperationToGraph({
          fromPoint: challengePoint,
          toPoint: resultPoint,
          operation: {
            type: 'multiply',
            description: '×2',
            value: '2',
            userCreated: true,
          },
        })
      );

      const state = (store.getState() as any).dailyCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should have: G, challenge, result, -result (negated challenge point should be added by the operation)
      expect(nodes).toHaveLength(4);

      // Check that negated result point exists
      const negatedResult = pointNegate(resultPoint);
      const negatedNode = nodes.find(
        node => node.point.x === negatedResult.x && node.point.y === negatedResult.y
      );
      expect(negatedNode).toBeDefined();
    });

    it('should handle subtraction operations with negation', () => {
      const generator = getGeneratorPoint();
      const fiveG = pointMultiply(5n, generator);
      const twoG = pointMultiply(2n, generator);
      const resultPoint = pointMultiply(3n, generator); // 5G - 2G = 3G

      // Add 5G first
      store.dispatch(
        addOperationToGraph({
          fromPoint: generator,
          toPoint: fiveG,
          operation: {
            type: 'multiply',
            description: '×5',
            value: '5',
            userCreated: true,
          },
        })
      );

      // Then subtract 2G
      store.dispatch(
        addOperationToGraph({
          fromPoint: fiveG,
          toPoint: resultPoint,
          operation: {
            type: 'subtract',
            description: '-2G',
            value: '2',
            point: twoG,
            userCreated: true,
          },
        })
      );

      const state = (store.getState() as any).dailyCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should have: G, 5G, -5G, 3G, -3G (and potentially 2G if it was added)
      expect(nodes.length).toBeGreaterThanOrEqual(5);

      // Verify both negated points exist
      const negatedFiveG = pointNegate(fiveG);
      const negatedThreeG = pointNegate(resultPoint);

      const negatedFiveGNode = nodes.find(
        node => node.point.x === negatedFiveG.x && node.point.y === negatedFiveG.y
      );
      const negatedThreeGNode = nodes.find(
        node => node.point.x === negatedThreeG.x && node.point.y === negatedThreeG.y
      );

      expect(negatedFiveGNode).toBeDefined();
      expect(negatedThreeGNode).toBeDefined();
    });

    it('should maintain graph integrity with multiple negated nodes', () => {
      const generator = getGeneratorPoint();
      const points = [
        pointMultiply(2n, generator),
        pointMultiply(3n, generator),
        pointMultiply(5n, generator),
      ];

      // Add multiple operations
      for (let i = 0; i < points.length; i++) {
        store.dispatch(
          addOperationToGraph({
            fromPoint: i === 0 ? generator : points[i - 1],
            toPoint: points[i],
            operation: {
              type: 'multiply',
              description: `×${i + 2}`,
              value: `${i + 2}`,
              userCreated: true,
            },
          })
        );
      }

      const state = (store.getState() as any).dailyCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];
      const edges = Object.values(state.graph.edges) as GraphEdge[];

      // Should have G + 3 points + 3 negated points = 7 nodes
      expect(nodes).toHaveLength(7);

      // Should have 3 multiply edges + 3 negate edges = 6 edges
      expect(edges).toHaveLength(6);

      // Verify all negated points exist and are valid
      for (const point of points) {
        const negatedPoint = pointNegate(point);
        const negatedNode = nodes.find(
          node => node.point.x === negatedPoint.x && node.point.y === negatedPoint.y
        );
        expect(negatedNode).toBeDefined();
      }

      // Verify all negate edges are marked as system-generated
      const negateEdges = edges.filter(edge => edge.operation.type === 'negate');
      expect(negateEdges).toHaveLength(3);
      negateEdges.forEach(edge => {
        expect(edge.operation.userCreated).toBe(false);
      });
    });

    it('should not interfere with existing negated points', () => {
      const generator = getGeneratorPoint();
      const twoG = pointMultiply(2n, generator);
      const negatedTwoG = pointNegate(twoG);

      // First, add an operation that creates 2G and -2G
      store.dispatch(
        addOperationToGraph({
          fromPoint: generator,
          toPoint: twoG,
          operation: {
            type: 'multiply',
            description: '×2',
            value: '2',
            userCreated: true,
          },
        })
      );

      // Then add an operation that involves the negated point
      store.dispatch(
        addOperationToGraph({
          fromPoint: negatedTwoG,
          toPoint: generator,
          operation: {
            type: 'add',
            description: '+2G',
            value: '2',
            point: twoG,
            userCreated: true,
          },
        })
      );

      const state = (store.getState() as any).dailyCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should have: G, 2G, -2G, and -G from the second operation's force multiplication
      expect(nodes).toHaveLength(4);

      // Count occurrences of each unique point
      const pointCounts = new Map<string, number>();
      nodes.forEach(node => {
        const key = `${node.point.x.toString()}_${node.point.y.toString()}_${node.point.isInfinity}`;
        pointCounts.set(key, (pointCounts.get(key) || 0) + 1);
      });

      // Each point should appear exactly once
      pointCounts.forEach(count => {
        expect(count).toBe(1);
      });
    });
  });
});
