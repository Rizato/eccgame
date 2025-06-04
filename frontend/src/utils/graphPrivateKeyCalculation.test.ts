import { describe, expect, it, beforeEach } from 'vitest';
import { CURVE_N, getGeneratorPoint, pointMultiply, pointToPublicKey } from './ecc';
import { createEmptyGraph, addNode, addEdge, findPath } from './pointGraph';
import type { PointGraph } from '../types/ecc';
import type { Challenge } from '../types/api';
import {
  calculateChallengePrivateKeyFromGraph,
  canSolveChallenge,
  getSolutionPath,
  updateAllPrivateKeys,
} from './graphPrivateKeyCalculation';

describe('Graph Private Key Calculation Tests', () => {
  const generatorPoint = getGeneratorPoint();
  let graph: PointGraph;

  beforeEach(() => {
    graph = createEmptyGraph();
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

      // Add challenge node with known private key
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

      // Create graph: G -> 5G -> 10G (challenge)
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

      // Add edges: G *5-> 5G *2-> 10G
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

    it('should return false when generator node not in graph', () => {
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

      // Add only challenge node
      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      const result = canSolveChallenge(challenge, graph);
      expect(result).toBe(false);
    });

    it('should return false when no path exists between challenge and generator', () => {
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

      // Add both nodes but no connecting edges
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

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

      // Create connected graph
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

    it('should return true when path exists between generator and challenge', () => {
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

      // Create connected graph
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
        type: 'multiply',
        description: 'x5',
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

    it('should return empty array when generator node not in graph', () => {
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

      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      const result = getSolutionPath(challenge, graph);
      expect(result).toEqual([]);
    });

    it('should return empty array when no path exists', () => {
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

      // Add both nodes but no connecting edges
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

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

    it('should return multi-step path descriptions', () => {
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

      // Path: Challenge -> 5G -> Generator
      addEdge(graph, challengeNode.id, node5G.id, {
        id: 'edge1',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      addEdge(graph, node5G.id, generatorNode.id, {
        id: 'edge2',
        type: 'divide',
        description: '÷5',
        value: '5',
      });

      const result = getSolutionPath(challenge, graph);
      expect(result).toEqual(['÷2', '÷5']);
    });
  });

  describe('updateAllPrivateKeys', () => {
    it('should handle empty graph', () => {
      updateAllPrivateKeys(graph);
      expect(graph.nodes.size).toBeFalsy();
    });

    it('should handle graph with no known private keys', () => {
      const point = pointMultiply(5n, generatorPoint);
      addNode(graph, point, {
        id: 'unknown',
        label: 'Unknown',
      });

      updateAllPrivateKeys(graph);
      const node = graph.nodes['unknown'];
      expect(node?.privateKey).toBeUndefined();
    });

    it('should propagate private keys through forward operations', () => {
      // Create G -> 5G chain
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

      addEdge(graph, generatorNode.id, node5G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      updateAllPrivateKeys(graph);

      expect(node5G.privateKey).toBe(5n);
    });

    it('should propagate private keys through backward operations', () => {
      // Create G <- 5G chain (5G has known key, G should be calculated)
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);
      const node5G = addNode(graph, point5G, {
        id: '5g',
        label: '5G',
        privateKey: 5n,
      });

      addEdge(graph, generatorNode.id, node5G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      updateAllPrivateKeys(graph);

      expect(generatorNode.privateKey).toBe(1n);
    });

    it('should handle complex graph with multiple paths - specific test case', () => {
      // Test case: nodes G (1G), 5G, 10G, Challenge (18G)
      // edges: G -> 5G, 10G -> 5G, Challenge -> 10G

      // Create nodes
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'G',
        privateKey: 1n,
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);
      const node5G = addNode(graph, point5G, {
        id: '5g',
        label: '5G',
      });

      const point10G = pointMultiply(10n, generatorPoint);
      const node10G = addNode(graph, point10G, {
        id: '10g',
        label: '10G',
      });

      const point18G = pointMultiply(18n, generatorPoint);
      const challengeNode = addNode(graph, point18G, {
        id: 'challenge',
        label: 'Challenge (18G)',
        isChallenge: true,
      });

      // Create edges
      // G -> 5G (multiply by 5)
      addEdge(graph, generatorNode.id, node5G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // 10G -> 5G (divide by 2)
      addEdge(graph, node10G.id, node5G.id, {
        id: 'edge2',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      // Challenge -> 10G (subtract 8G)
      addEdge(graph, challengeNode.id, node10G.id, {
        id: 'edge3',
        type: 'subtract',
        description: '-8',
        value: '8',
      });

      updateAllPrivateKeys(graph);

      // Verify all private keys are calculated correctly
      expect(generatorNode.privateKey).toBe(1n);
      expect(node5G.privateKey).toBe(5n);
      expect(node10G.privateKey).toBe(10n);
      expect(challengeNode.privateKey).toBe(18n);
    });

    it('should handle negate operations', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const negatedPoint = pointMultiply(-1n, generatorPoint);
      const negatedNode = addNode(graph, negatedPoint, {
        id: 'negated',
        label: 'Negated G',
      });

      addEdge(graph, generatorNode.id, negatedNode.id, {
        id: 'edge1',
        type: 'negate',
        description: '±',
        value: '',
      });

      updateAllPrivateKeys(graph);

      // Negated point should have private key CURVE_N - 1 (which is -1 in modular arithmetic)
      expect(negatedNode.privateKey).toBeDefined();
      expect(negatedNode.privateKey).toBe(CURVE_N - 1n);
    });

    it('should handle add and subtract operations correctly', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point4G = pointMultiply(4n, generatorPoint);
      const node4G = addNode(graph, point4G, {
        id: '4g',
        label: '4G',
      });

      // G + 3G = 4G
      addEdge(graph, generatorNode.id, node4G.id, {
        id: 'edge1',
        type: 'add',
        description: '+3',
        value: '3',
      });

      updateAllPrivateKeys(graph);

      expect(node4G.privateKey).toBe(4n);
    });

    it('should handle divide operations correctly', () => {
      const point6G = pointMultiply(6n, generatorPoint);
      const node6G = addNode(graph, point6G, {
        id: '6g',
        label: '6G',
        privateKey: 6n,
      });

      const point3G = pointMultiply(3n, generatorPoint);
      const node3G = addNode(graph, point3G, {
        id: '3g',
        label: '3G',
      });

      // 6G / 2 = 3G
      addEdge(graph, node6G.id, node3G.id, {
        id: 'edge1',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      updateAllPrivateKeys(graph);

      expect(node3G.privateKey).toBe(3n);
    });

    it('should not overwrite existing private keys', () => {
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
        privateKey: 999n, // Wrong value, but should not be overwritten
      });

      addEdge(graph, generatorNode.id, node5G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      updateAllPrivateKeys(graph);

      // Should keep the existing (wrong) value
      expect(node5G.privateKey).toBe(999n);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle challenge with invalid public key', () => {
      const challenge: Challenge = {
        uuid: 'test-challenge',
        public_key: 'invalid-key',
        p2pkh_address: 'test-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(() => {
        calculateChallengePrivateKeyFromGraph(challenge, graph);
      }).toThrow();
    });

    it('should handle disconnected graph components', () => {
      // Create two separate components
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point2G = pointMultiply(2n, generatorPoint);
      const node2G = addNode(graph, point2G, {
        id: '2g',
        label: '2G',
      });

      // Separate component
      const point7G = pointMultiply(7n, generatorPoint);
      const node7G = addNode(graph, point7G, {
        id: '7g',
        label: '7G',
        privateKey: 7n,
      });

      const point14G = pointMultiply(14n, generatorPoint);
      const node14G = addNode(graph, point14G, {
        id: '14g',
        label: '14G',
      });

      // Connect within components
      addEdge(graph, generatorNode.id, node2G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      addEdge(graph, node7G.id, node14G.id, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      updateAllPrivateKeys(graph);

      // Both components should be updated independently
      expect(node2G.privateKey).toBe(2n);
      expect(node14G.privateKey).toBe(14n);
    });

    it('should handle cycles in the graph', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point2G = pointMultiply(2n, generatorPoint);
      const node2G = addNode(graph, point2G, {
        id: '2g',
        label: '2G',
      });

      // Create a cycle: G -> 2G -> G
      addEdge(graph, generatorNode.id, node2G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      addEdge(graph, node2G.id, generatorNode.id, {
        id: 'edge2',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      updateAllPrivateKeys(graph);

      // Should handle cycle gracefully and calculate correct private key
      expect(node2G.privateKey).toBe(2n);
      expect(generatorNode.privateKey).toBe(1n); // Should not be overwritten
    });
  });

  describe('Practice Mode Win Condition Tests', () => {
    it('should not be solved when only challenge is in graph', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Add challenge node with known private key (practice mode)
      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 7n,
        isChallenge: true,
      });

      // Should not be solvable - no generator (even though we know the private key)
      expect(canSolveChallenge(challenge, graph)).toBe(false);
      // Private key is known, but challenge isn't solved without path to generator
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(7n);
    });

    it('should not be solved when only generator is in graph', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Add only generator node to graph
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      // Should not be solvable - no challenge node
      expect(canSolveChallenge(challenge, graph)).toBe(false);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBeUndefined();
    });

    it('should not be solved when both nodes exist but no path exists', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Add both nodes but no connecting edges
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 7n, // Practice mode - private key known
        isChallenge: true,
      });

      // Should not be solvable - no path between them (even though private key is known)
      expect(canSolveChallenge(challenge, graph)).toBe(false);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(7n);
    });

    it('should be solved when path exists from challenge to generator', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
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

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 7n, // Practice mode - private key known
        isChallenge: true,
      });

      // Add path from challenge to generator
      addEdge(graph, challengeNode.id, generatorNode.id, {
        id: 'edge1',
        type: 'divide',
        description: '÷7',
        value: '7',
      });

      // Should be solvable since there's a path from challenge to generator
      expect(canSolveChallenge(challenge, graph)).toBe(true);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(7n);
    });

    it('should be solved when path exists from generator to challenge', () => {
      const challengePoint = pointMultiply(7n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
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

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 7n, // Practice mode - private key known
        isChallenge: true,
      });

      // Add only reverse path: generator -> challenge
      addEdge(graph, generatorNode.id, challengeNode.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×7',
        value: '7',
      });

      // Should be solvable - have a connection from graph to challenge
      expect(canSolveChallenge(challenge, graph)).toBe(true);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(7n);
    });

    it('should be solved when path exists from challenge to generator through intermediate nodes', () => {
      const challengePoint = pointMultiply(14n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
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

      const point7G = pointMultiply(7n, generatorPoint);
      const node7G = addNode(graph, point7G, {
        id: '7g',
        label: '7G',
      });

      const point10G = pointMultiply(10n, generatorPoint);
      const node10G = addNode(graph, point10G, {
        id: '10g',
        label: '10G',
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 14n, // Practice mode - private key known
        isChallenge: true,
      });

      // Add forward path only: G -> 10G (this doesn't help solve it)
      addEdge(graph, generatorNode.id, node10G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×10',
        value: '10',
      });

      // Should NOT be solvable yet - no path from challenge to generator
      expect(canSolveChallenge(challenge, graph)).toBe(false);
      // Private key is already known (practice mode), but challenge isn't solved
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(14n);
      expect(canSolveChallenge(challenge, graph)).toBe(false); // Still not solvable

      // Now add reverse path: Challenge (14G) -> 7G -> 10G -> G
      addEdge(graph, challengeNode.id, node7G.id, {
        id: 'edge3',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      addEdge(graph, node7G.id, node10G.id, {
        id: 'edge4',
        type: 'add',
        description: '+3',
        value: '3',
      });

      // Now should be solvable - path exists from challenge to generator
      expect(canSolveChallenge(challenge, graph)).toBe(true);

      // Update private keys and verify solution
      updateAllPrivateKeys(graph);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(14n);
    });

    it('should maintain unsolved state during partial construction of path from challenge to generator', () => {
      const challengePoint = pointMultiply(6n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
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

      const point2G = pointMultiply(2n, generatorPoint);
      const node2G = addNode(graph, point2G, {
        id: '2g',
        label: '2G',
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 6n, // Practice mode - private key known
        isChallenge: true,
      });

      // Step 1: Add partial forward path G -> 2G
      addEdge(graph, generatorNode.id, node2G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      expect(canSolveChallenge(challenge, graph)).toBe(false);

      // Step 2: Add reverse path challenge -> 2G
      addEdge(graph, challengeNode.id, node2G.id, {
        id: 'edge2',
        type: 'divide',
        description: '÷3',
        value: '3',
      });

      // Now complete path from challenge to generator exists
      expect(canSolveChallenge(challenge, graph)).toBe(true);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(6n);
    });

    it('should be solved when direct connection from challenge to generator is created', () => {
      const challengePoint = pointMultiply(5n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
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

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        privateKey: 5n, // Practice mode - private key known
        isChallenge: true,
      });

      // Initially not connected
      expect(canSolveChallenge(challenge, graph)).toBe(false);

      // Add forward connection G -> Challenge
      addEdge(graph, generatorNode.id, challengeNode.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Now should be immediately solvable
      expect(canSolveChallenge(challenge, graph)).toBe(true);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(5n);
    });

    it('should handle complex graph with multiple possible paths', () => {
      const challengePoint = pointMultiply(12n, generatorPoint);
      const challenge: Challenge = {
        uuid: 'practice-challenge',
        public_key: pointToPublicKey(challengePoint),
        p2pkh_address: 'practice-address',
        metadata: [],
        explorer_link: '',
        active: true,
        active_date: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      };

      // Create complex graph with multiple paths:
      // G -> 3G -> 6G -> 12G (challenge)
      // G -> 4G -> 12G (challenge)
      // Challenge -> 6G -> 3G -> G
      // Challenge -> 4G -> G

      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point3G = pointMultiply(3n, generatorPoint);
      const node3G = addNode(graph, point3G, {
        id: '3g',
        label: '3G',
      });

      const point4G = pointMultiply(4n, generatorPoint);
      const node4G = addNode(graph, point4G, {
        id: '4g',
        label: '4G',
      });

      const point6G = pointMultiply(6n, generatorPoint);
      const node6G = addNode(graph, point6G, {
        id: '6g',
        label: '6G',
      });

      const challengeNode = addNode(graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge',
        isChallenge: true,
      });

      // Add forward paths
      addEdge(graph, generatorNode.id, node3G.id, {
        id: 'edge1',
        type: 'multiply',
        description: '×3',
        value: '3',
      });

      addEdge(graph, node3G.id, node6G.id, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      addEdge(graph, node6G.id, challengeNode.id, {
        id: 'edge3',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      addEdge(graph, generatorNode.id, node4G.id, {
        id: 'edge4',
        type: 'multiply',
        description: '×4',
        value: '4',
      });

      addEdge(graph, node4G.id, challengeNode.id, {
        id: 'edge5',
        type: 'multiply',
        description: '×3',
        value: '3',
      });

      // Add one reverse path: Challenge -> 6G -> 3G -> G
      addEdge(graph, challengeNode.id, node6G.id, {
        id: 'edge6',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      addEdge(graph, node6G.id, node3G.id, {
        id: 'edge7',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      addEdge(graph, node3G.id, generatorNode.id, {
        id: 'edge8',
        type: 'divide',
        description: '÷3',
        value: '3',
      });

      // Now should be solvable with path from challenge to generator
      expect(canSolveChallenge(challenge, graph)).toBe(true);
      expect(calculateChallengePrivateKeyFromGraph(challenge, graph)).toBe(12n);
      // Finds the shortest path of 2
      expect(findPath(graph, 'challenge', 'generator')?.length).toBe(2);
    });
  });
});
