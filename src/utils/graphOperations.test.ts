import { describe, expect, it, beforeEach } from 'vitest';
import {
  CURVE_N,
  getGeneratorPoint,
  pointMultiply,
  pointToPublicKey,
  pointMultiplyWithIntermediates,
  pointNegate,
} from './ecc';
import {
  createEmptyGraph,
  addNode,
  ensureOperationInGraph,
  calculateChallengePrivateKeyFromGraph,
} from './graphOperations';
import type { Operation, PointGraph } from '../types/ecc';
import type { Challenge } from '../types/game';

describe('Graph Operations', () => {
  const generatorPoint = getGeneratorPoint();
  let graph: PointGraph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  describe('ensureOperationInGraph', () => {
    it('should add nodes and edges to empty graph', () => {
      const point5G = pointMultiply(5n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      expect(Object.keys(graph.nodes)).toHaveLength(2);
      expect(Object.keys(graph.edges)).toHaveLength(1);
    });

    it('should not duplicate existing nodes', () => {
      const point5G = pointMultiply(5n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      expect(Object.keys(graph.nodes)).toHaveLength(2);
      expect(Object.keys(graph.edges)).toHaveLength(1);
    });

    it('should propagate private key forward when fromNode has key', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      const point5GNode = Object.values(graph.nodes).find(
        node => node.point.x === point5G.x && node.point.y === point5G.y
      );

      expect(point5GNode?.privateKey).toBe(5n);
    });

    it('should propagate private key backward when toNode has key', () => {
      const point5G = pointMultiply(5n, generatorPoint);

      addNode(graph, point5G, {
        id: '5g',
        label: '5G',
        privateKey: 5n,
      });

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      const generatorNode = Object.values(graph.nodes).find(
        node => node.point.x === generatorPoint.x && node.point.y === generatorPoint.y
      );

      expect(generatorNode?.privateKey).toBe(1n);
    });

    it('should handle negate operations', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const negatedPoint = pointMultiply(-1n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, negatedPoint, {
        type: 'negate',
        description: '±',
        value: '',
      });

      const negatedNode = Object.values(graph.nodes).find(
        node => node.point.x === negatedPoint.x && node.point.y === negatedPoint.y
      );

      expect(negatedNode?.privateKey).toBeDefined();
      expect(negatedNode?.privateKey).toBe(CURVE_N - 1n);
    });
  });

  describe('calculateChallengePrivateKeyFromGraph', () => {
    it('should return undefined when challenge node not in graph', () => {
      const challenge: Challenge = {
        id: 1,
        public_key: pointToPublicKey(pointMultiply(5n, generatorPoint)),
        p2pkh_address: 'test-address',
        tags: [],
      };

      const result = calculateChallengePrivateKeyFromGraph(challenge, graph);
      expect(result).toBeUndefined();
    });

    it('should return stored private key when already calculated', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        id: 1,
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        tags: [],
      };

      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 7n,
        isChallenge: true,
      });

      const result = calculateChallengePrivateKeyFromGraph(challenge, graph);
      expect(result).toBe(7n);
    });

    it('should calculate private key when propagated through ensureOperationInGraph', () => {
      const challengePoint = pointMultiply(10n, generatorPoint);
      const challenge: Challenge = {
        id: 1,
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        tags: [],
      };

      // Add generator node with private key
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      // Use ensureOperationInGraph to create the path and propagate private keys
      const point5G = pointMultiply(5n, generatorPoint);
      ensureOperationInGraph(graph, generatorPoint, point5G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      ensureOperationInGraph(graph, point5G, challengePoint, {
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const result = calculateChallengePrivateKeyFromGraph(challenge, graph);
      expect(result).toBe(10n);
    });
  });

  describe('connectedToG propagation', () => {
    it('should propagate connectedToG from generator node', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });
      generatorNode.connectedToG = true;

      const point2G = pointMultiply(2n, generatorPoint);
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const node2G = Object.values(graph.nodes).find(
        node => node.point.x === point2G.x && node.point.y === point2G.y
      );

      expect(node2G?.connectedToG).toBe(true);
    });

    it('should propagate connectedToG through multiple operations', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });
      generatorNode.connectedToG = true;

      const point2G = pointMultiply(2n, generatorPoint);
      const point5G = pointMultiply(5n, generatorPoint);
      const point10G = pointMultiply(10n, generatorPoint);

      // Create a chain: G -> 2G -> 10G (via ×5) and also 5G -> 10G (via ×2)
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      // Add 5G without connection to G initially
      addNode(graph, point5G, {
        id: '5g',
        label: '5G',
      });

      ensureOperationInGraph(graph, point2G, point10G, {
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Now connect 5G to 10G - this should propagate connectedToG back to 5G
      ensureOperationInGraph(graph, point5G, point10G, {
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const node5G = Object.values(graph.nodes).find(
        node => node.point.x === point5G.x && node.point.y === point5G.y
      );

      expect(node5G?.connectedToG).toBe(true);
    });
  });

  describe('Force multiplication with intermediates', () => {
    it('should add intermediate nodes from pointMultiplyWithIntermediates', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const scalar = 5n; // Binary: 101, will produce intermediates
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      // Simulate adding all intermediates to the graph like ECCCalculator would
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
        currentPoint = intermediate.point;
      }

      // Add final result if different from last intermediate
      if (
        intermediates.length > 0 &&
        (result.x !== currentPoint.x || result.y !== currentPoint.y)
      ) {
        ensureOperationInGraph(graph, currentPoint, result, {
          type: 'multiply',
          description: 'Final',
          value: '1',
          userCreated: false,
        });
      }

      // Should have more nodes than just generator and final result
      const nodeCount = Object.keys(graph.nodes).length;
      expect(nodeCount).toBeGreaterThan(2);

      // All intermediate nodes should have private keys propagated
      for (const node of Object.values(graph.nodes)) {
        if (!node.point.isInfinity) {
          expect(node.privateKey).toBeDefined();
        }
      }
    });

    it('should handle automatic negation operations in graph', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const negatedPoint = pointNegate(generatorPoint);

      // Simulate automatic negation being added by calculator slice
      ensureOperationInGraph(graph, generatorPoint, negatedPoint, {
        type: 'negate',
        description: '±',
        value: '',
        userCreated: false, // Automatically added
      });

      // Should have both generator and negated point
      expect(Object.keys(graph.nodes)).toHaveLength(2);

      // Negated point should have correct private key
      const negatedNode = Object.values(graph.nodes).find(
        node => node.point.x === negatedPoint.x && node.point.y === negatedPoint.y
      );

      expect(negatedNode?.privateKey).toBe(CURVE_N - 1n);
    });

    it('should propagate private keys through complex intermediate chains', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      // Use a larger scalar to get more intermediates
      const scalar = 13n; // Binary: 1101, will produce several intermediates
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      // Add all intermediates to the graph
      let previousPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph, previousPoint, intermediate.point, intermediate.operation);
        previousPoint = intermediate.point;
      }

      // Final result should have the correct private key
      const finalNode = Object.values(graph.nodes).find(
        node => node.point.x === result.x && node.point.y === result.y
      );

      expect(finalNode?.privateKey).toBe(scalar);

      // All intermediate nodes should have valid private keys
      for (const node of Object.values(graph.nodes)) {
        if (!node.point.isInfinity && node.privateKey !== undefined) {
          // Verify the private key actually generates the correct point
          const generatedPoint = pointMultiply(node.privateKey, generatorPoint);
          expect(generatedPoint.x).toBe(node.point.x);
          expect(generatedPoint.y).toBe(node.point.y);
        }
      }
    });

    it('should handle mixed user and automatic operations', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      // User operation: multiply by 3
      const point3G = pointMultiply(3n, generatorPoint);
      ensureOperationInGraph(graph, generatorPoint, point3G, {
        type: 'multiply',
        description: '×3',
        value: '3',
        userCreated: true,
      });

      // Force multiplication that adds intermediates for same operation
      const { intermediates } = pointMultiplyWithIntermediates(3n, generatorPoint);

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph, currentPoint, intermediate.point, {
          ...intermediate.operation,
          userCreated: false,
        });
        currentPoint = intermediate.point;
      }

      // Should have multiple edges between same points for different operations
      const edgeCount = Object.keys(graph.edges).length;
      expect(edgeCount).toBeGreaterThan(1);

      // Final result should still be correct
      const point3GNode = Object.values(graph.nodes).find(
        node => node.point.x === point3G.x && node.point.y === point3G.y
      );

      expect(point3GNode?.privateKey).toBe(3n);
    });
  });

  describe('Duplicate edge handling', () => {
    it('should not create duplicate edges for identical operations', () => {
      const point5G = pointMultiply(5n, generatorPoint);
      const operation: Operation = {
        type: 'multiply',
        description: '×5',
        value: '5',
        userCreated: true,
      };

      // Add the same operation twice
      ensureOperationInGraph(graph, generatorPoint, point5G, operation);
      ensureOperationInGraph(graph, generatorPoint, point5G, operation);

      // Should only have one edge with the same ID
      const edgeIds = Object.keys(graph.edges);
      const duplicateEdgeIds = edgeIds.filter(
        id => edgeIds.indexOf(id) !== edgeIds.lastIndexOf(id)
      );

      expect(duplicateEdgeIds).toHaveLength(0);
      expect(Object.keys(graph.edges)).toHaveLength(1);
    });

    it('should create separate edges for same points with different operations', () => {
      const point2G = pointMultiply(2n, generatorPoint);

      // Add different operations between same points
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      ensureOperationInGraph(graph, generatorPoint, point2G, {
        type: 'add',
        description: '+G',
        value: '1',
      });

      // Should have two different edges
      expect(Object.keys(graph.edges)).toHaveLength(2);
      expect(Object.keys(graph.nodes)).toHaveLength(2); // Still same nodes
    });

    it('should handle overwriting userCreated true to false, but stays true', () => {
      const point7G = pointMultiply(7n, generatorPoint);

      // Add user operation
      ensureOperationInGraph(graph, generatorPoint, point7G, {
        type: 'multiply',
        description: '×7',
        value: '7',
        userCreated: true,
      });

      // Add automatic operation
      ensureOperationInGraph(graph, generatorPoint, point7G, {
        type: 'multiply',
        description: '×7',
        value: '7',
        userCreated: false,
      });

      expect(Object.keys(graph.edges)).toHaveLength(1);

      // Test that edge userCreated is true (stays true after false overwrites)
      const edgeId = `${Object.values(graph.nodes)[0].id}_to_${Object.values(graph.nodes)[1].id}_by_operation_multiply_7`;
      const edge = graph.edges[edgeId];
      expect(edge).toBeDefined();
      expect(edge.operation.userCreated).toBe(true);
    });

    it('should handle overwriting userCreated false to true', () => {
      const point7G = pointMultiply(7n, generatorPoint);

      // Add automatic operation
      ensureOperationInGraph(graph, generatorPoint, point7G, {
        type: 'multiply',
        description: '×7',
        value: '7',
        userCreated: false,
      });

      // Add user operation
      ensureOperationInGraph(graph, generatorPoint, point7G, {
        type: 'multiply',
        description: '×7',
        value: '7',
        userCreated: true,
      });

      expect(Object.keys(graph.edges)).toHaveLength(1);

      // Test that edge userCreated is true (becomes true after false)
      const edgeId = `${Object.values(graph.nodes)[0].id}_to_${Object.values(graph.nodes)[1].id}_by_operation_multiply_7`;
      const edge = graph.edges[edgeId];
      expect(edge).toBeDefined();
      expect(edge.operation.userCreated).toBe(true);
    });
  });
});
