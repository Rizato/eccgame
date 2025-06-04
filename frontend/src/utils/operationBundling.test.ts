import { describe, it, expect } from 'vitest';
import { createBundledEdges, optimizeGraphWithBundling, isPointSaved } from './operationBundling';
import { createEmptyGraph, addNode, addEdge } from './pointGraph';
import type { ECPoint, Operation, SavedPoint } from '../types/ecc';
import { CURVE_N } from './ecc.ts';

describe('Operation Bundling', () => {
  const mockPoint1: ECPoint = { x: 1n, y: 2n };
  const mockPoint2: ECPoint = { x: 3n, y: 4n };
  const mockPoint3: ECPoint = { x: 5n, y: 6n };
  const mockPoint4: ECPoint = { x: 10n, y: 23n };

  const mockOperation1: Operation = {
    id: 'op1',
    type: 'multiply',
    description: 'Multiply by 2',
    value: '2',
  };

  const mockOperation2: Operation = {
    id: 'op2',
    type: 'add',
    description: 'Add 3',
    value: '3',
  };

  it('should identify saved points correctly', () => {
    const savedPoints: SavedPoint[] = [
      {
        id: 'saved1',
        point: mockPoint1,
        label: 'Saved Point 1',
        timestamp: Date.now(),
      },
    ];

    expect(isPointSaved(mockPoint1, savedPoints)).toBe(true);
    expect(isPointSaved(mockPoint2, savedPoints)).toBe(false);
  });

  it('should create bundled edges between saved points', () => {
    // Create a graph with three nodes
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Point 1' });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });

    // Add edges: 1 -> 2 -> 3
    addEdge(graph, node1.id, node2.id, mockOperation1);
    addEdge(graph, node2.id, node3.id, mockOperation2);

    // Mark points 1 and 3 as saved
    const savedPoints: SavedPoint[] = [
      {
        id: 'saved1',
        point: mockPoint1,
        label: 'Saved Point 1',
        timestamp: Date.now(),
      },
      {
        id: 'saved3',
        point: mockPoint3,
        label: 'Saved Point 3',
        timestamp: Date.now(),
      },
    ];

    const bundledEdges = createBundledEdges(graph, savedPoints);

    // Should have created a bundled edge from point 1 to point 3
    expect(bundledEdges.length).toBeGreaterThan(0);

    const bundledEdge = bundledEdges.find(
      edge => edge.fromNodeId === node1.id && edge.toNodeId === node3.id
    );

    expect(bundledEdge).toBeDefined();
    expect(bundledEdge?.isBundled).toBe(true);
    // With scalar optimization, bundledOperations contains the computed scalar operation
  });

  it('should optimize graph with bundling', () => {
    // Create a graph with saved points
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Point 1', isGenerator: true });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });

    addEdge(graph, node1.id, node2.id, mockOperation1);
    addEdge(graph, node2.id, node3.id, mockOperation2);

    const savedPoints: SavedPoint[] = [
      {
        id: 'saved3',
        point: mockPoint3,
        label: 'Saved Point 3',
        timestamp: Date.now(),
      },
    ];

    const optimizedGraph = optimizeGraphWithBundling(graph, savedPoints);

    // Should only preserve important nodes (generator + saved points)
    expect(Object.keys(optimizedGraph.nodes).length).toBe(2); // generator + saved point

    // Should have optimized edges
    expect(Object.keys(optimizedGraph.edges).length).toBeGreaterThanOrEqual(1);

    // Generator node should be preserved
    expect(optimizedGraph.nodes[node1.id]).toBeDefined();
    expect(optimizedGraph.nodes[node1.id].isGenerator).toBe(true);

    // Saved point should be preserved
    expect(optimizedGraph.nodes[node3.id]).toBeDefined();
  });

  it('should create scalar operations for non-negation bundled operations', () => {
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Point 1', isGenerator: true });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });

    // Add multiply by 2 then add 3  = add 5
    const multiplyBy2: Operation = {
      id: 'op1',
      type: 'multiply',
      description: 'Multiply by 2',
      value: '2',
    };

    const add3: Operation = {
      id: 'op2',
      type: 'add',
      description: 'Add 3',
      value: '3',
    };

    addEdge(graph, node1.id, node2.id, multiplyBy2);
    // Simulate intermediate node for second operation
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });
    addEdge(graph, node2.id, node3.id, add3);

    const savedPoints: SavedPoint[] = [
      {
        id: 'saved1',
        point: mockPoint1,
        label: 'Saved Point 1',
        timestamp: Date.now(),
      },
      {
        id: 'saved3',
        point: mockPoint3,
        label: 'Saved Point 3',
        timestamp: Date.now(),
      },
    ];

    const bundledEdges = createBundledEdges(graph, savedPoints);

    // Should create a bundled edge between saved points
    const bundledEdge = bundledEdges.find(
      edge => edge.fromNodeId === node1.id && edge.toNodeId === node3.id
    );

    expect(bundledEdge).toBeDefined();
    expect(bundledEdge?.isBundled).toBe(true);
    expect(bundledEdge?.bundleCount).toBe(2n);

    // Should be a scalar operation (add 5)
    expect(bundledEdge?.operation.type).toBe('add');
    expect(bundledEdge?.operation.value).toBe('5');
    expect(bundledEdge?.operation.description).toContain('+5');
  });

  it('should create add operations for bundled operations with a negative combined scalar', () => {
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Point 1', isGenerator: true });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });

    // Add multiply by 2 then add 3  = add 5
    const multiplyBy2: Operation = {
      id: 'op1',
      type: 'multiply',
      description: 'Multiply by 2',
      value: '2',
    };

    const add3: Operation = {
      id: 'op2',
      type: 'add',
      description: 'Add 3',
      value: '3',
    };

    const subtract10: Operation = {
      id: 'op3',
      type: 'subtract',
      description: 'Subtract 10',
      value: '10',
    };

    addEdge(graph, node1.id, node2.id, multiplyBy2);
    // Simulate intermediate node for second operation
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });
    addEdge(graph, node2.id, node3.id, add3);
    const node4 = addNode(graph, mockPoint4, { label: 'Point 4' });
    addEdge(graph, node3.id, node4.id, subtract10);

    const savedPoints: SavedPoint[] = [
      {
        id: 'saved1',
        point: mockPoint1,
        label: 'Saved Point 1',
        timestamp: Date.now(),
      },
      {
        id: 'saved4',
        point: mockPoint4,
        label: 'Saved Point 4',
        timestamp: Date.now(),
      },
    ];

    const bundledEdges = createBundledEdges(graph, savedPoints);

    // Should create a bundled edge between saved points
    const bundledEdge = bundledEdges.find(
      edge => edge.fromNodeId === node1.id && edge.toNodeId === node4.id
    );

    expect(bundledEdge).toBeDefined();
    expect(bundledEdge?.isBundled).toBe(true);
    expect(bundledEdge?.bundleCount).toBe(3n);

    // Should be a scalar operation (add 5)
    expect(bundledEdge?.operation.type).toBe('add');
    expect(bundledEdge?.operation.value).toBe(`${CURVE_N - 5n}`);
    expect(bundledEdge?.operation.description).toContain(`+${CURVE_N - 5n}`);
  });

  it('should include negated nodes in bundling', () => {
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Generator', isGenerator: true });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });
    const node3 = addNode(graph, mockPoint3, { label: 'Negated Point' });

    const multiplyBy2: Operation = {
      id: 'mul2',
      type: 'multiply',
      description: 'Multiply by 2',
      value: '2',
    };
    const negate: Operation = { id: 'neg', type: 'negate', description: 'Negate', value: '' };

    addEdge(graph, node1.id, node2.id, multiplyBy2);
    addEdge(graph, node2.id, node3.id, negate);

    const savedPoints: SavedPoint[] = [
      { id: 'saved1', point: mockPoint1, label: 'Saved Generator', timestamp: Date.now() },
      {
        id: 'saved3',
        point: mockPoint3,
        label: 'Saved Point 3',
        timestamp: Date.now(),
      },
    ];

    const bundledEdges = createBundledEdges(graph, savedPoints);
    // Should create a bundled edge between saved points
    const bundledEdge = bundledEdges.find(
      edge => edge.fromNodeId === node1.id && edge.toNodeId === node3.id
    );

    expect(bundledEdge).toBeDefined();
    expect(bundledEdge?.isBundled).toBe(true);
    expect(bundledEdge?.bundleCount).toBe(2n);

    // Should be a scalar operation (add -2)
    expect(bundledEdge?.operation.type).toBe('add');
    expect(bundledEdge?.operation.value).toBe(`${CURVE_N - 2n}`);
    expect(bundledEdge?.operation.description).toContain(`+${CURVE_N - 2n}`);
  });
});
