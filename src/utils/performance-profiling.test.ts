import { describe, it } from 'vitest';
import { getGeneratorPoint, pointMultiply, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';

describe('Performance Profiling', () => {
  const generatorPoint = getGeneratorPoint();

  function measureTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  it('should profile multiplication performance differences', () => {
    console.log('\n=== MULTIPLICATION PERFORMANCE COMPARISON ===');

    // Test with various scalar sizes
    const scalars = [7n, 31n, 127n, 1023n, 8191n];

    for (const scalar of scalars) {
      console.log(`\nTesting scalar: ${scalar} (binary length: ${scalar.toString(2).length})`);

      // 1. Original pointMultiply (using elliptic library)
      const originalResult = measureTime(`  Original pointMultiply`, () =>
        pointMultiply(scalar, generatorPoint)
      );

      // 2. New pointMultiplyWithIntermediates (custom double-and-add)
      const { result: newResult, intermediates } = measureTime(
        `  pointMultiplyWithIntermediates`,
        () => pointMultiplyWithIntermediates(scalar, generatorPoint)
      );

      console.log(`  Intermediates generated: ${intermediates.length}`);

      // Verify results are the same
      if (originalResult.x !== newResult.x || originalResult.y !== newResult.y) {
        console.error("  ❌ Results don't match!");
      } else {
        console.log('  ✅ Results match');
      }
    }
  });

  it('should profile graph operations overhead', () => {
    console.log('\n=== GRAPH OPERATIONS OVERHEAD ===');

    const scalar = 1023n; // Large enough to see differences

    // 1. Just the math operations
    const mathOnlyResult = measureTime(`Math only (pointMultiplyWithIntermediates)`, () =>
      pointMultiplyWithIntermediates(scalar, generatorPoint)
    );

    // 2. Math + Graph operations (what happens in the calculator)
    const graph = createEmptyGraph();
    addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });

    const graphWithMathResult = measureTime(`Math + Graph operations`, () => {
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
        currentPoint = intermediate.point;
      }

      return { result, intermediates, nodeCount: Object.keys(graph.nodes).length };
    });

    console.log(`Intermediates: ${mathOnlyResult.intermediates.length}`);
    console.log(`Nodes created: ${graphWithMathResult.nodeCount}`);
  });

  it('should profile private key propagation overhead', () => {
    console.log('\n=== PRIVATE KEY PROPAGATION OVERHEAD ===');

    const scalar = 511n;

    // Create graph without propagation
    const graphNoProp = createEmptyGraph();
    const withoutPropagationTime = measureTime(`Graph operations WITHOUT propagation`, () => {
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      // Add generator manually without triggering propagation
      addNode(graphNoProp, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        // Don't set privateKey to avoid auto-propagation
      });

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        // Add nodes without private keys to avoid propagation
        addNode(graphNoProp, intermediate.point, {
          label: 'Intermediate',
        });
        currentPoint = intermediate.point;
      }

      return Object.keys(graphNoProp.nodes).length;
    });

    // Create graph with propagation
    const graphWithProp = createEmptyGraph();
    const withPropagationTime = measureTime(`Graph operations WITH propagation`, () => {
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      // Add generator with private key (triggers propagation)
      addNode(graphWithProp, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        privateKey: 1n,
        isGenerator: true,
      });

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(
          graphWithProp,
          currentPoint,
          intermediate.point,
          intermediate.operation
        );
        currentPoint = intermediate.point;
      }

      return Object.keys(graphWithProp.nodes).length;
    });

    console.log(`Nodes without propagation: ${withoutPropagationTime}`);
    console.log(`Nodes with propagation: ${withPropagationTime}`);
  });

  it('should profile node lookup vs creation', () => {
    console.log('\n=== NODE LOOKUP VS CREATION OVERHEAD ===');

    const graph = createEmptyGraph();
    const scalar = 255n;
    const { intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Time adding all nodes initially
    const nodeCreationTime = measureTime(`Creating ${intermediates.length} nodes`, () => {
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        addNode(graph, intermediate.point, { label: 'Test' });
        currentPoint = intermediate.point;
      }
    });

    // Time looking up existing nodes
    const nodeLookupTime = measureTime(`Looking up ${intermediates.length} existing nodes`, () => {
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        addNode(graph, intermediate.point, { label: 'Test Update' }); // Should find existing
        currentPoint = intermediate.point;
      }
    });

    console.log(
      `Node creation vs lookup ratio: ${(nodeCreationTime / nodeLookupTime).toFixed(2)}x`
    );
  });

  it('should profile different scalar sizes', () => {
    console.log('\n=== SCALAR SIZE IMPACT ===');

    const scalars = [
      { value: 3n, label: 'Small (3)' },
      { value: 15n, label: 'Medium (15)' },
      { value: 255n, label: 'Large (255)' },
      { value: 4095n, label: 'Very Large (4095)' },
    ];

    for (const { value, label } of scalars) {
      console.log(`\n${label} - Binary: ${value.toString(2)}`);

      const graph = createEmptyGraph();
      addNode(graph, generatorPoint, {
        id: 'generator',
        privateKey: 1n,
        isGenerator: true,
      });

      const result = measureTime(`  Complete operation`, () => {
        const { result, intermediates } = pointMultiplyWithIntermediates(value, generatorPoint);

        let currentPoint = generatorPoint;
        for (const intermediate of intermediates) {
          ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
          currentPoint = intermediate.point;
        }

        return {
          intermediates: intermediates.length,
          nodes: Object.keys(graph.nodes).length,
          edges: Object.keys(graph.edges).length,
        };
      });

      console.log(
        `  Intermediates: ${result.intermediates}, Nodes: ${result.nodes}, Edges: ${result.edges}`
      );
    }
  });
});
