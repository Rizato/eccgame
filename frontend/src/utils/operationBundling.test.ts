import { describe, it, expect } from 'vitest';
import {
  createBundledEdges,
  optimizeGraphWithBundling,
  getEffectiveOperations,
  isPointSaved,
} from './operationBundling';
import { createEmptyGraph, addNode, addEdge } from './pointGraph';
import type { ECPoint, Operation, SavedPoint } from '../types/ecc';

describe('Operation Bundling', () => {
  const mockPoint1: ECPoint = { x: 1n, y: 2n };
  const mockPoint2: ECPoint = { x: 3n, y: 4n };
  const mockPoint3: ECPoint = { x: 5n, y: 6n };

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
    expect(bundledEdge?.bundledOperations).toHaveLength(1);
  });

  it('should get effective operations from bundled and regular edges', () => {
    const regularEdge = {
      id: 'regular',
      fromNodeId: 'node1',
      toNodeId: 'node2',
      operation: mockOperation1,
    };

    const bundledEdge = {
      id: 'bundled',
      fromNodeId: 'node1',
      toNodeId: 'node3',
      operation: mockOperation1,
      bundledOperations: [mockOperation1, mockOperation2],
      isBundled: true,
    };

    expect(getEffectiveOperations(regularEdge)).toEqual([mockOperation1]);
    expect(getEffectiveOperations(bundledEdge)).toEqual([mockOperation1, mockOperation2]);
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

    // Add multiply by 2 then multiply by 3 = multiply by 6
    const multiplyBy2: Operation = {
      id: 'op1',
      type: 'multiply',
      description: 'Multiply by 2',
      value: '2',
    };

    const multiplyBy3: Operation = {
      id: 'op2',
      type: 'multiply',
      description: 'Multiply by 3',
      value: '3',
    };

    addEdge(graph, node1.id, node2.id, multiplyBy2);
    // Simulate intermediate node for second operation
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });
    addEdge(graph, node2.id, node3.id, multiplyBy3);

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

    // Should be a scalar operation (multiply by 6)
    expect(bundledEdge?.operation.type).toBe('multiply');
    expect(bundledEdge?.operation.value).toBe('6');
    expect(bundledEdge?.operation.description).toContain('×6');
  });

  it('should remove negation pairs', () => {
    const graph = createEmptyGraph();
    const node1 = addNode(graph, mockPoint1, { label: 'Point 1', isGenerator: true });
    const node2 = addNode(graph, mockPoint2, { label: 'Point 2' });
    const node3 = addNode(graph, mockPoint3, { label: 'Point 3' });

    // Create a path with negation pair that should cancel out
    const negate1: Operation = { id: 'neg1', type: 'negate', description: 'Negate', value: '' };
    const negate2: Operation = { id: 'neg2', type: 'negate', description: 'Negate', value: '' };
    const multiplyBy5: Operation = {
      id: 'mul5',
      type: 'multiply',
      description: 'Multiply by 5',
      value: '5',
    };

    // Simulate: point1 -> negate -> point2 -> negate -> point3 -> multiply by 5 -> final point
    addEdge(graph, node1.id, node2.id, negate1);
    addEdge(graph, node2.id, node3.id, negate2);
    const node4 = addNode(graph, { x: 7n, y: 8n }, { label: 'Point 4' });
    addEdge(graph, node3.id, node4.id, multiplyBy5);

    const savedPoints: SavedPoint[] = [
      { id: 'saved1', point: mockPoint1, label: 'Saved 1', timestamp: Date.now() },
      { id: 'saved4', point: { x: 7n, y: 8n }, label: 'Saved 4', timestamp: Date.now() },
    ];

    const bundledEdges = createBundledEdges(graph, savedPoints);

    const bundledEdge = bundledEdges.find(
      edge => edge.fromNodeId === node1.id && edge.toNodeId === node4.id
    );

    expect(bundledEdge).toBeDefined();
    // Should reduce to just multiply by 5 (negation pair canceled)
    expect(bundledEdge?.operation.value).toBe('5');
  });

  it('should preserve negation nodes and edges', () => {
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
    ];

    const optimizedGraph = optimizeGraphWithBundling(graph, savedPoints);

    // Should preserve negation-related nodes
    expect(optimizedGraph.nodes[node2.id]).toBeDefined(); // Node involved in negation
    expect(optimizedGraph.nodes[node3.id]).toBeDefined(); // Result of negation

    // Should preserve negation edge
    const negationEdge = Object.values(optimizedGraph.edges).find(
      edge => edge.operation.type === 'negate'
    );
    expect(negationEdge).toBeDefined();
  });
});
