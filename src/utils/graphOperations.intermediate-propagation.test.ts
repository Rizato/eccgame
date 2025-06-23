import { describe, expect, it, beforeEach } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';
import type { PointGraph } from '../types/ecc';

describe('Intermediate Node Property Propagation', () => {
  const generatorPoint = getGeneratorPoint();
  let graph: PointGraph;

  beforeEach(() => {
    graph = createEmptyGraph();
  });

  it('should propagate privateKey through intermediate nodes', () => {
    // Add generator node with private key and connectedToG
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    // Use a scalar that creates intermediate points
    const scalar = 7n; // Binary: 111, creates multiple intermediate steps
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Add all intermediates to the graph sequentially
    let currentPoint = generatorPoint;
    for (const intermediate of intermediates) {
      ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
      currentPoint = intermediate.point;
    }

    // Add final result if different from last intermediate
    if (intermediates.length > 0 && (result.x !== currentPoint.x || result.y !== currentPoint.y)) {
      ensureOperationInGraph(graph, currentPoint, result, {
        type: 'multiply',
        description: 'Final',
        value: '1',
        userCreated: false,
      });
    }

    // Verify all intermediate nodes have private keys
    const nodes = Object.values(graph.nodes);
    for (const node of nodes) {
      if (!node.point.isInfinity) {
        expect(node.privateKey).toBeDefined();
        expect(node.privateKey).toBeGreaterThan(0n);

        // Verify the private key is mathematically correct
        if (node.privateKey) {
          const verificationPoint = pointMultiplyWithIntermediates(
            node.privateKey,
            generatorPoint
          ).result;
          expect(verificationPoint.x).toBe(node.point.x);
          expect(verificationPoint.y).toBe(node.point.y);
        }
      }
    }

    // Verify final result has correct private key
    const finalNode = nodes.find(node => node.point.x === result.x && node.point.y === result.y);
    expect(finalNode?.privateKey).toBe(scalar);
  });

  it('should propagate connectedToG through intermediate nodes', () => {
    // Add generator node with connectedToG flag
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    // Use a scalar that creates intermediate points
    const scalar = 11n; // Binary: 1011, creates multiple intermediate steps
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Add all intermediates to the graph sequentially
    let currentPoint = generatorPoint;
    for (const intermediate of intermediates) {
      ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
      currentPoint = intermediate.point;
    }

    // Add final result if different from last intermediate
    if (intermediates.length > 0 && (result.x !== currentPoint.x || result.y !== currentPoint.y)) {
      ensureOperationInGraph(graph, currentPoint, result, {
        type: 'multiply',
        description: 'Final',
        value: '1',
        userCreated: false,
      });
    }

    // Verify all nodes are connected to G
    const nodes = Object.values(graph.nodes);
    for (const node of nodes) {
      if (!node.point.isInfinity) {
        expect(node.connectedToG).toBe(true);
      }
    }
  });

  it('should propagate both privateKey and connectedToG through complex intermediate chains', () => {
    // Add generator node with both properties
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    // Use a larger scalar to get many intermediate steps
    const scalar = 23n; // Binary: 10111, creates several intermediate steps
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Verify we actually have intermediate steps
    expect(intermediates.length).toBeGreaterThan(2);

    // Add all intermediates to the graph sequentially
    let previousPoint = generatorPoint;
    for (const intermediate of intermediates) {
      ensureOperationInGraph(graph, previousPoint, intermediate.point, intermediate.operation);
      previousPoint = intermediate.point;
    }

    // Add final result if different from last intermediate
    if (
      intermediates.length > 0 &&
      (result.x !== previousPoint.x || result.y !== previousPoint.y)
    ) {
      ensureOperationInGraph(graph, previousPoint, result, {
        type: 'multiply',
        description: 'Final',
        value: '1',
        userCreated: false,
      });
    }

    // Verify all nodes have both properties correctly set
    const nodes = Object.values(graph.nodes);
    expect(nodes.length).toBeGreaterThan(3); // Should have generator + intermediates + final

    for (const node of nodes) {
      if (!node.point.isInfinity) {
        // Should have private key
        expect(node.privateKey).toBeDefined();
        expect(node.privateKey).toBeGreaterThan(0n);

        // Should be connected to G
        expect(node.connectedToG).toBe(true);

        // Private key should be mathematically correct
        if (node.privateKey) {
          const verificationPoint = pointMultiplyWithIntermediates(
            node.privateKey,
            generatorPoint
          ).result;
          expect(verificationPoint.x).toBe(node.point.x);
          expect(verificationPoint.y).toBe(node.point.y);
        }
      }
    }

    // Final result should have the expected private key
    const finalNode = nodes.find(node => node.point.x === result.x && node.point.y === result.y);
    expect(finalNode?.privateKey).toBe(scalar);
    expect(finalNode?.connectedToG).toBe(true);
  });

  it('should handle backward propagation when final node has properties but intermediates do not', () => {
    // Add generator without properties initially
    addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
    });

    const scalar = 9n; // Binary: 1001
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Add all intermediates first without propagation
    let currentPoint = generatorPoint;
    for (const intermediate of intermediates) {
      ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
      currentPoint = intermediate.point;
    }

    // Now add the final result node with known private key and connectedToG
    const finalNode = addNode(graph, result, {
      id: 'final',
      label: 'Final Result',
      privateKey: scalar,
    });
    finalNode.connectedToG = true;

    // Connect the chain to the final node
    if (intermediates.length > 0) {
      ensureOperationInGraph(graph, currentPoint, result, {
        type: 'multiply',
        description: 'Final',
        value: '1',
        userCreated: false,
      });
    }

    // Manually trigger propagation from the final node since we set properties after creation
    triggerPropagationFromNode(graph, finalNode.id);

    // Now all nodes should have propagated properties
    const nodes = Object.values(graph.nodes);
    for (const node of nodes) {
      if (!node.point.isInfinity) {
        expect(node.privateKey).toBeDefined();
        expect(node.connectedToG).toBe(true);
      }
    }
  });
});
