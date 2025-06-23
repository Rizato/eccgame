import { describe, it } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';

describe('Performance Optimizations', () => {
  const generatorPoint = getGeneratorPoint();

  function measureTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  it('should test batched vs individual graph operations', () => {
    console.log('\n=== BATCHED VS INDIVIDUAL OPERATIONS ===');

    const scalar = 1023n;
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Current approach: Individual operations with full propagation
    const graph1 = createEmptyGraph();
    addNode(graph1, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });

    const individualTime = measureTime(`Individual operations (current)`, () => {
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph1, currentPoint, intermediate.point, intermediate.operation);
        currentPoint = intermediate.point;
      }
      return Object.keys(graph1.nodes).length;
    });

    // Optimized approach: Batch add nodes first, then set properties
    const graph2 = createEmptyGraph();
    const batchedTime = measureTime(`Batched operations (optimized)`, () => {
      // 1. Add generator
      const generatorNode = addNode(graph2, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
      });

      // 2. Batch add all intermediate nodes WITHOUT private keys (no propagation)
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        addNode(graph2, intermediate.point, {
          label: `Intermediate ${intermediate.operation.description}`,
        });
        currentPoint = intermediate.point;
      }

      // 3. Add all edges WITHOUT triggering propagation per edge
      currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        // Add edge manually without ensureOperationInGraph to avoid per-edge propagation
        const fromNode =
          graph2.nodes[
            Object.values(graph2.nodes).find(
              n => n.point.x === currentPoint.x && n.point.y === currentPoint.y
            )?.id || ''
          ];
        const toNode =
          graph2.nodes[
            Object.values(graph2.nodes).find(
              n => n.point.x === intermediate.point.x && n.point.y === intermediate.point.y
            )?.id || ''
          ];

        if (fromNode && toNode) {
          graph2.edges[
            `${fromNode.id}_to_${toNode.id}_${intermediate.operation.type}_${intermediate.operation.value}`
          ] = {
            id: `${fromNode.id}_to_${toNode.id}_${intermediate.operation.type}_${intermediate.operation.value}`,
            fromNodeId: fromNode.id,
            toNodeId: toNode.id,
            operation: intermediate.operation,
          };
        }
        currentPoint = intermediate.point;
      }

      // 4. Set generator private key LAST to trigger single propagation wave
      generatorNode.privateKey = 1n;
      generatorNode.connectedToG = true;

      // 5. Manually calculate private keys in sequence (more efficient than recursive propagation)
      let privateKey = 1n;
      currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        const node = Object.values(graph2.nodes).find(
          n => n.point.x === intermediate.point.x && n.point.y === intermediate.point.y
        );
        if (node) {
          // Calculate private key based on operation
          if (intermediate.operation.type === 'multiply') {
            privateKey = privateKey * BigInt(intermediate.operation.value);
          } else if (intermediate.operation.type === 'add') {
            privateKey = privateKey + 1n; // Double operation
          }
          node.privateKey = privateKey;
          node.connectedToG = true;
        }
        currentPoint = intermediate.point;
      }

      return Object.keys(graph2.nodes).length;
    });

    console.log(`Speedup: ${(individualTime / batchedTime).toFixed(2)}x`);
    console.log(`Nodes created: Individual=${individualTime}, Batched=${batchedTime}`);
  });

  it('should test lazy vs eager private key calculation', () => {
    console.log('\n=== LAZY VS EAGER PRIVATE KEY CALCULATION ===');

    const scalar = 511n;
    const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Eager calculation (current approach)
    const graph1 = createEmptyGraph();
    addNode(graph1, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });

    const eagerTime = measureTime(`Eager private key calculation`, () => {
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph1, currentPoint, intermediate.point, intermediate.operation);
        currentPoint = intermediate.point;
      }
      return Object.keys(graph1.nodes).length;
    });

    // Lazy calculation - only calculate when needed
    const graph2 = createEmptyGraph();
    const lazyTime = measureTime(`Lazy private key calculation`, () => {
      // Add generator
      addNode(graph2, generatorPoint, {
        id: 'generator',
        label: 'Generator',
        isGenerator: true,
        // No private key initially
      });

      // Add all nodes and edges without private key calculation
      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        const fromNode = Object.values(graph2.nodes).find(
          n => n.point.x === currentPoint.x && n.point.y === currentPoint.y
        );

        const toNode = addNode(graph2, intermediate.point, {
          label: `Intermediate ${intermediate.operation.description}`,
          // No private key
        });

        if (fromNode) {
          graph2.edges[
            `${fromNode.id}_to_${toNode.id}_${intermediate.operation.type}_${intermediate.operation.value}`
          ] = {
            id: `${fromNode.id}_to_${toNode.id}_${intermediate.operation.type}_${intermediate.operation.value}`,
            fromNodeId: fromNode.id,
            toNodeId: toNode.id,
            operation: intermediate.operation,
          };
        }

        currentPoint = intermediate.point;
      }

      // Only calculate private keys for final result when needed
      const finalNode = Object.values(graph2.nodes).find(
        n => n.point.x === result.x && n.point.y === result.y
      );
      if (finalNode) {
        finalNode.privateKey = scalar;
        // Don't propagate backwards
      }

      return Object.keys(graph2.nodes).length;
    });

    console.log(`Speedup: ${(eagerTime / lazyTime).toFixed(2)}x`);
  });

  it('should test memory-optimized point hashing', () => {
    console.log('\n=== POINT HASHING OPTIMIZATION ===');

    const scalar = 255n;
    const { intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // Current approach: String-based hashing
    const currentHashTime = measureTime(`Current string-based hashing`, () => {
      const hashes = new Set<string>();
      for (const intermediate of intermediates) {
        const hash = `${intermediate.point.x.toString(16)}_${intermediate.point.y.toString(16)}`;
        hashes.add(hash);
      }
      return hashes.size;
    });

    // Optimized approach: BigInt-based comparison
    const optimizedTime = measureTime(`Direct BigInt comparison`, () => {
      const points = new Map<string, any>();
      for (const intermediate of intermediates) {
        // Use a simpler key that's faster to generate
        const key = `${intermediate.point.x}_${intermediate.point.y}`;
        points.set(key, intermediate);
      }
      return points.size;
    });

    console.log(`Hashing speedup: ${(currentHashTime / optimizedTime).toFixed(2)}x`);
  });

  it('should test intermediate calculation skipping', () => {
    console.log('\n=== SKIP INTERMEDIATE CALCULATION FOR PERFORMANCE ===');

    const scalar = 2047n;

    // Full intermediate calculation (current)
    const fullTime = measureTime(`Full intermediate calculation`, () => {
      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      const graph = createEmptyGraph();
      addNode(graph, generatorPoint, {
        id: 'generator',
        privateKey: 1n,
        isGenerator: true,
      });

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        ensureOperationInGraph(graph, currentPoint, intermediate.point, intermediate.operation);
        currentPoint = intermediate.point;
      }

      return {
        nodes: Object.keys(graph.nodes).length,
        intermediates: intermediates.length,
      };
    });

    // Skip intermediates for large scalars
    const skippedTime = measureTime(`Skip intermediates (direct calculation)`, () => {
      const graph = createEmptyGraph();

      // Add generator
      const generatorNode = addNode(graph, generatorPoint, {
        id: 'generator',
        privateKey: 1n,
        isGenerator: true,
      });

      // Add final result directly
      const { result } = pointMultiplyWithIntermediates(scalar, generatorPoint);
      const finalNode = addNode(graph, result, {
        label: 'Final Result',
        privateKey: scalar,
      });

      // Add single edge
      graph.edges['generator_to_final'] = {
        id: 'generator_to_final',
        fromNodeId: generatorNode.id,
        toNodeId: finalNode.id,
        operation: {
          type: 'multiply',
          description: `×${scalar}`,
          value: scalar.toString(),
          userCreated: true,
        },
      };

      return {
        nodes: Object.keys(graph.nodes).length,
        intermediates: 0,
      };
    });

    console.log(
      `Full calculation: ${fullTime.nodes} nodes, ${fullTime.intermediates} intermediates`
    );
    console.log(
      `Skipped calculation: ${skippedTime.nodes} nodes, ${skippedTime.intermediates} intermediates`
    );
    console.log(`Speedup by skipping: ${(fullTime / skippedTime).toFixed(2)}x`);
  });
});
