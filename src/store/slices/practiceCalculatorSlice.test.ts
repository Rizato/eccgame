import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGeneratorPoint, pointMultiply, pointNegate } from '../../utils/ecc';
import practiceCalculatorReducer, {
  addOperationToGraph,
  clearPracticeState,
} from './practiceCalculatorSlice';
import type { Operation, GraphNode, GraphEdge } from '../../types/ecc';

describe('PracticeCalculatorSlice Force Multiplication', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        practiceCalculator: practiceCalculatorReducer,
      },
    });

    // Clear state and get initial state
    store.dispatch(clearPracticeState());
  });

  describe('Automatic Negation', () => {
    it('should add negated node when adding any operation', () => {
      const fromPoint = getGeneratorPoint();
      const toPoint = pointMultiply(2n, fromPoint); // 2G
      const operation: Operation = {
        type: 'multiply',
        description: '×2',
        value: '2',
        userCreated: true,
      };

      // Add operation to graph
      store.dispatch(
        addOperationToGraph({
          fromPoint,
          toPoint,
          operation,
        })
      );

      const state = (store.getState() as any).practiceCalculator;

      // Should have nodes for fromPoint, toPoint, and negated toPoint
      const nodes = Object.values(state.graph.nodes) as GraphNode[];
      expect(nodes).toHaveLength(3); // G, 2G, -2G

      // Check that negated point exists
      const negatedPoint = pointNegate(toPoint);
      const negatedNode = nodes.find(
        node => node.point.x === negatedPoint.x && node.point.y === negatedPoint.y
      );
      expect(negatedNode).toBeDefined();

      // Should have edges: G -> 2G (multiply) and 2G -> -2G (negate)
      const edges = Object.values(state.graph.edges) as GraphEdge[];
      expect(edges).toHaveLength(2);

      const negateEdge = edges.find(edge => edge.operation.type === 'negate');
      expect(negateEdge).toBeDefined();
      expect(negateEdge?.operation.userCreated).toBe(false);
    });

    it('should add negated generator point', () => {
      const fromPoint = { x: 0n, y: 0n, isInfinity: true }; // Point at infinity
      const toPoint = getGeneratorPoint(); // G
      const operation: Operation = {
        type: 'add',
        description: '+G',
        value: '1',
        userCreated: true,
      };

      store.dispatch(
        addOperationToGraph({
          fromPoint,
          toPoint,
          operation,
        })
      );

      const state = (store.getState() as any).practiceCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should have infinity, G, and -G
      expect(nodes).toHaveLength(3);

      // Check that negated generator exists
      const negatedG = pointNegate(getGeneratorPoint());
      const negatedGNode = nodes.find(
        node => node.point.x === negatedG.x && node.point.y === negatedG.y
      );
      expect(negatedGNode).toBeDefined();
    });

    it('should handle multiple operations creating negated nodes', () => {
      const generator = getGeneratorPoint();

      // First operation: G -> 2G
      const twoG = pointMultiply(2n, generator);
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

      // Second operation: 2G -> 3G
      const threeG = pointMultiply(3n, generator);
      store.dispatch(
        addOperationToGraph({
          fromPoint: twoG,
          toPoint: threeG,
          operation: {
            type: 'add',
            description: '+G',
            value: '1',
            point: generator,
            userCreated: true,
          },
        })
      );

      const state = (store.getState() as any).practiceCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should have: G, 2G, -2G, 3G, -3G
      expect(nodes).toHaveLength(5);

      // Verify negated nodes exist
      const negatedTwoG = pointNegate(twoG);
      const negatedThreeG = pointNegate(threeG);

      const negatedTwoGNode = nodes.find(
        node => node.point.x === negatedTwoG.x && node.point.y === negatedTwoG.y
      );
      const negatedThreeGNode = nodes.find(
        node => node.point.x === negatedThreeG.x && node.point.y === negatedThreeG.y
      );

      expect(negatedTwoGNode).toBeDefined();
      expect(negatedThreeGNode).toBeDefined();

      // Should have 4 edges total: G->2G, 2G->-2G, 2G->3G, 3G->-3G
      const edges = Object.values(state.graph.edges) as GraphEdge[];
      expect(edges).toHaveLength(4);

      const negateEdges = edges.filter(edge => edge.operation.type === 'negate');
      expect(negateEdges).toHaveLength(2);
    });

    it('should not duplicate negated nodes for same point', () => {
      const generator = getGeneratorPoint();
      const twoG = pointMultiply(2n, generator);

      // Add same operation twice
      const operation: Operation = {
        type: 'multiply',
        description: '×2',
        value: '2',
        userCreated: true,
      };

      store.dispatch(
        addOperationToGraph({
          fromPoint: generator,
          toPoint: twoG,
          operation,
        })
      );

      store.dispatch(
        addOperationToGraph({
          fromPoint: generator,
          toPoint: twoG,
          operation,
        })
      );

      const state = (store.getState() as any).practiceCalculator;
      const nodes = Object.values(state.graph.nodes) as GraphNode[];

      // Should still only have 3 nodes: G, 2G, -2G
      expect(nodes).toHaveLength(3);

      // Count nodes with the same point (should be only 1 of each)
      const generatorNodes = nodes.filter(
        node => node.point.x === generator.x && node.point.y === generator.y
      );
      const twoGNodes = nodes.filter(node => node.point.x === twoG.x && node.point.y === twoG.y);
      const negatedTwoGNodes = nodes.filter(node => {
        const negatedTwoG = pointNegate(twoG);
        return node.point.x === negatedTwoG.x && node.point.y === negatedTwoG.y;
      });

      expect(generatorNodes).toHaveLength(1);
      expect(twoGNodes).toHaveLength(1);
      expect(negatedTwoGNodes).toHaveLength(1);
    });

    it('should preserve original operation userCreated flag', () => {
      const fromPoint = getGeneratorPoint();
      const toPoint = pointMultiply(2n, fromPoint);
      const operation: Operation = {
        type: 'multiply',
        description: '×2',
        value: '2',
        userCreated: true,
      };

      store.dispatch(
        addOperationToGraph({
          fromPoint,
          toPoint,
          operation,
        })
      );

      const state = (store.getState() as any).practiceCalculator;
      const edges = Object.values(state.graph.edges) as GraphEdge[];

      // Find the original operation edge and negation edge
      const multiplyEdge = edges.find(edge => edge.operation.type === 'multiply');
      const negateEdge = edges.find(edge => edge.operation.type === 'negate');

      expect(multiplyEdge?.operation.userCreated).toBe(true);
      expect(negateEdge?.operation.userCreated).toBe(false);
    });
  });
});
