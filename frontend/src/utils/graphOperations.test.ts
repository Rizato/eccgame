import { describe, expect, it, beforeEach } from 'vitest';
import { CURVE_N, getGeneratorPoint, pointMultiply, pointToPublicKey } from './ecc';
import {
  createEmptyGraph,
  addNode,
  ensureOperationInGraph,
  calculateChallengePrivateKeyFromGraph,
} from './graphOperations';
import type { Challenge } from '../types/game';
import type { PointGraph } from '../types/ecc';

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
        id: 'edge1',
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
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge2',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      expect(Object.keys(graph.nodes)).toHaveLength(2);
      expect(Object.keys(graph.edges)).toHaveLength(2);
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
        id: 'edge1',
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
        id: 'edge1',
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
        id: 'edge1',
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
        id: 'op1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      ensureOperationInGraph(graph, point5G, challengePoint, {
        id: 'op2',
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
        id: 'op1',
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
        id: 'op1',
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
        id: 'op2',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Now connect 5G to 10G - this should propagate connectedToG back to 5G
      ensureOperationInGraph(graph, point5G, point10G, {
        id: 'op3',
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
});
