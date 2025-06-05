import { describe, expect, it, beforeEach } from 'vitest';
import { CURVE_N, getGeneratorPoint, pointMultiply } from './ecc';
import { ensureOperationInGraph } from './ensureOperationInGraph';
import { createEmptyGraph, addNode } from './pointGraph';
import type { PointGraph } from '../types/ecc';

describe('ensureOperationInGraph', () => {
  const generatorPoint = getGeneratorPoint();
  let graph: PointGraph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  describe('basic operation adding', () => {
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

      // Add first operation
      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Add second operation using same points
      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge2',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      expect(Object.keys(graph.nodes)).toHaveLength(2); // Should still be 2 nodes
      expect(Object.keys(graph.edges)).toHaveLength(2); // But 2 edges
    });
  });

  describe('private key propagation', () => {
    it('should handle empty graph', () => {
      const point5G = pointMultiply(5n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Both nodes should have no private keys if none were provided
      const nodes = Object.values(graph.nodes);
      expect(nodes.every(node => node.privateKey === undefined)).toBe(true);
    });

    it('should propagate private key forward when fromNode has key', () => {
      // Pre-add generator with private key
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

      // Pre-add target point with private key
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

    it('should detect and correct inconsistent private keys when both nodes have keys', () => {
      // Pre-add both nodes with private keys
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);
      const point5GNode = addNode(graph, point5G, {
        id: '5g',
        label: '5G',
        privateKey: 999n, // Wrong value
      });

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Should correct the inconsistent private key
      expect(generatorNode.privateKey).toBe(1n);
      expect(point5GNode.privateKey).toBe(5n); // Should be corrected from 999n to 5n
    });

    it('should not propagate when neither node has private key', () => {
      const point5G = pointMultiply(5n, generatorPoint);

      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      const nodes = Object.values(graph.nodes);
      expect(nodes.every(node => node.privateKey === undefined)).toBe(true);
    });

    it('should recursively propagate through connected nodes', () => {
      // Create initial chain: G (known) -> 5G -> 10G
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point5G = pointMultiply(5n, generatorPoint);
      const point10G = pointMultiply(10n, generatorPoint);

      // Add first operation: G -> 5G
      ensureOperationInGraph(graph, generatorPoint, point5G, {
        id: 'edge1',
        type: 'multiply',
        description: '×5',
        value: '5',
      });

      // Add second operation: 5G -> 10G (should propagate from 5G which now has key)
      ensureOperationInGraph(graph, point5G, point10G, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const point5GNode = Object.values(graph.nodes).find(
        node => node.point.x === point5G.x && node.point.y === point5G.y
      );
      const point10GNode = Object.values(graph.nodes).find(
        node => node.point.x === point10G.x && node.point.y === point10G.y
      );

      expect(point5GNode?.privateKey).toBe(5n);
      expect(point10GNode?.privateKey).toBe(10n);
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

      // Negated point should have private key CURVE_N - 1 (which is -1 in modular arithmetic)
      expect(negatedNode?.privateKey).toBeDefined();
      expect(negatedNode?.privateKey).toBe(CURVE_N - 1n);
    });

    it('should handle add and subtract operations correctly', () => {
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point4G = pointMultiply(4n, generatorPoint);

      // G + 3G = 4G
      ensureOperationInGraph(graph, generatorPoint, point4G, {
        id: 'edge1',
        type: 'add',
        description: '+3',
        value: '3',
      });

      const point4GNode = Object.values(graph.nodes).find(
        node => node.point.x === point4G.x && node.point.y === point4G.y
      );

      expect(point4GNode?.privateKey).toBe(4n);
    });

    it('should handle divide operations correctly', () => {
      const point6G = pointMultiply(6n, generatorPoint);
      addNode(graph, point6G, {
        id: '6g',
        label: '6G',
        privateKey: 6n,
      });

      const point3G = pointMultiply(3n, generatorPoint);

      // 6G / 2 = 3G
      ensureOperationInGraph(graph, point6G, point3G, {
        id: 'edge1',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      const point3GNode = Object.values(graph.nodes).find(
        node => node.point.x === point3G.x && node.point.y === point3G.y
      );

      expect(point3GNode?.privateKey).toBe(3n);
    });

    it('should handle complex recursive propagation', () => {
      // Test case: Start with node in middle, propagate both directions
      // Create chain: G <- 5G (known) -> 10G -> 20G

      const point5G = pointMultiply(5n, generatorPoint);
      addNode(graph, point5G, {
        id: '5g',
        label: '5G',
        privateKey: 5n,
      });

      // Add G <- 5G operation (should propagate backward to G)
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

      // Add 5G -> 10G operation (should propagate forward to 10G)
      const point10G = pointMultiply(10n, generatorPoint);
      ensureOperationInGraph(graph, point5G, point10G, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const point10GNode = Object.values(graph.nodes).find(
        node => node.point.x === point10G.x && node.point.y === point10G.y
      );
      expect(point10GNode?.privateKey).toBe(10n);

      // Add 10G -> 20G operation (should propagate forward to 20G)
      const point20G = pointMultiply(20n, generatorPoint);
      ensureOperationInGraph(graph, point20G, point10G, {
        id: 'edge3',
        type: 'divide',
        description: '×2',
        value: '2',
      });

      const point20GNode = Object.values(graph.nodes).find(
        node => node.point.x === point20G.x && node.point.y === point20G.y
      );
      expect(point20GNode?.privateKey).toBe(20n);
    });

    it('should handle disconnected graph components', () => {
      // Create two separate components and ensure they don't interfere
      addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point2G = pointMultiply(2n, generatorPoint);

      // First component: G -> 2G
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      // Separate component: 7G -> 14G
      const point7G = pointMultiply(7n, generatorPoint);
      addNode(graph, point7G, {
        id: '7g',
        label: '7G',
        privateKey: 7n,
      });

      const point14G = pointMultiply(14n, generatorPoint);
      ensureOperationInGraph(graph, point7G, point14G, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      const point2GNode = Object.values(graph.nodes).find(
        node => node.point.x === point2G.x && node.point.y === point2G.y
      );
      const point14GNode = Object.values(graph.nodes).find(
        node => node.point.x === point14G.x && node.point.y === point14G.y
      );

      // Both components should be updated independently
      expect(point2GNode?.privateKey).toBe(2n);
      expect(point14GNode?.privateKey).toBe(14n);
    });

    it('should handle cycles in the graph gracefully', () => {
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point2G = pointMultiply(2n, generatorPoint);

      // Create a cycle: G -> 2G
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      // 2G -> G (creates cycle)
      ensureOperationInGraph(graph, point2G, generatorPoint, {
        id: 'edge2',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      const point2GNode = Object.values(graph.nodes).find(
        node => node.point.x === point2G.x && node.point.y === point2G.y
      );

      // Should handle cycle gracefully and calculate correct private key
      expect(point2GNode?.privateKey).toBe(2n);
      expect(generatorNode.privateKey).toBe(1n); // Should not be overwritten
    });

    it('should avoid infinite recursion with visited tracking', () => {
      // This test ensures the visited set prevents infinite loops
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const point2G = pointMultiply(2n, generatorPoint);
      const point4G = pointMultiply(4n, generatorPoint);

      // Create a more complex cycle: G -> 2G -> 4G
      ensureOperationInGraph(graph, generatorPoint, point2G, {
        id: 'edge1',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      ensureOperationInGraph(graph, point2G, point4G, {
        id: 'edge2',
        type: 'multiply',
        description: '×2',
        value: '2',
      });

      // Now create back connections: 4G -> 2G and 2G -> G
      ensureOperationInGraph(graph, point4G, point2G, {
        id: 'edge3',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      ensureOperationInGraph(graph, point2G, generatorPoint, {
        id: 'edge4',
        type: 'divide',
        description: '÷2',
        value: '2',
      });

      const point2GNode = Object.values(graph.nodes).find(
        node => node.point.x === point2G.x && node.point.y === point2G.y
      );
      const point4GNode = Object.values(graph.nodes).find(
        node => node.point.x === point4G.x && node.point.y === point4G.y
      );

      // All nodes should have correct private keys without infinite recursion
      expect(generatorNode.privateKey).toBe(1n);
      expect(point2GNode?.privateKey).toBe(2n);
      expect(point4GNode?.privateKey).toBe(4n);
    });
  });
});
