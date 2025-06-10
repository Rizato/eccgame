import { describe, expect, it, beforeEach } from 'vitest';
import { CURVE_N, getGeneratorPoint, pointMultiply, pointToPublicKey } from './ecc';
import {
  createEmptyGraph,
  addNode,
  addEdge,
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
        uuid: 'test-challenge',
        public_key: pointToPublicKey(pointMultiply(5n, generatorPoint)),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = calculateChallengePrivateKeyFromGraph(challenge, graph);
      expect(result).toBeUndefined();
    });

    it('should return stored private key when already calculated', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
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

    it('should calculate private key using graph traversal', () => {
      const challengePoint = pointMultiply(10n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);
      const node5G = addNode(graph, point5G, {
        id: '5g',
        label: '5G',
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      addEdge(graph, generatorNode.id, node5G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      addEdge(graph, node5G.id, challengeNode.id, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const result = calculateChallengePrivateKeyFromGraph(challenge, graph);
      expect(result).toBe(10n);
    });
  });

  describe('canSolveChallenge', () => {
    it('should return false when challenge node not in graph', () => {
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(pointMultiply(5n, generatorPoint)),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = canSolveChallenge(challenge, graph);
      expect(result).toBe(false);
    });

    it('should return true when path exists between challenge and generator', () => {
      const challengePoint = pointMultiply(5n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      addEdge(graph, challengeNode.id, generatorNode.id, {
        id: 'edge1',
        type: 'divide',
        description: '÷5',
        value: '5',
      });

      const result = canSolveChallenge(challenge, graph);
      expect(result).toBe(true);
    });
  });

  describe('getSolutionPath', () => {
    it('should return empty array when challenge node not in graph', () => {
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(pointMultiply(5n, generatorPoint)),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const result = getSolutionPath(challenge, graph);
      expect(result).toEqual([]);
    });

    it('should return path descriptions for simple path', () => {
      const challengePoint = pointMultiply(5n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      addEdge(graph, challengeNode.id, generatorNode.id, {
        id: 'edge1',
        type: 'divide',
        description: '÷5',
        value: '5',
      });

      const result = getSolutionPath(challenge, graph);
      expect(result).toEqual(['÷5']);
    });
  });
});
