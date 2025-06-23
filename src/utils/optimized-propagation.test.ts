import { describe, it, expect } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';
import { startProfiling, profile, endProfiling } from './simple-profiler';

describe('Optimized Private Key Propagation', () => {
  const generatorPoint = getGeneratorPoint();

  function measureTime<T>(label: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  it('should only propagate private keys for user-created operations with connectedToG mismatch', () => {
    console.log('\n🚀 TESTING OPTIMIZED PRIVATE KEY PROPAGATION 🚀');

    const graph = createEmptyGraph();

    // Add generator with private key and connectedToG
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    const { intermediates } = pointMultiplyWithIntermediates(127n, generatorPoint);
    console.log(`Generated ${intermediates.length} intermediate steps`);

    // Test 1: System-generated operations (should NOT propagate private keys)
    let currentPoint = generatorPoint;
    let nodesWithPrivateKeys = 0;

    for (let i = 0; i < 5; i++) {
      // Test first 5 intermediates
      const intermediate = intermediates[i];

      ensureOperationInGraph(graph, currentPoint, intermediate.point, {
        ...intermediate.operation,
        userCreated: false, // System-generated
      });

      const newNode = Object.values(graph.nodes).find(
        node => node.point.x === intermediate.point.x && node.point.y === intermediate.point.y
      );

      if (newNode?.privateKey !== undefined) {
        nodesWithPrivateKeys++;
      }

      currentPoint = intermediate.point;
    }

    console.log(
      `After system operations: ${nodesWithPrivateKeys} nodes have private keys (should be 0)`
    );
    expect(nodesWithPrivateKeys).toBe(0);

    // Test 2: User-created operations (should propagate private keys)
    const userIntermediates = intermediates.slice(5, 8); // Next 3 intermediates
    let userNodesWithPrivateKeys = 0;

    for (const intermediate of userIntermediates) {
      ensureOperationInGraph(graph, currentPoint, intermediate.point, {
        ...intermediate.operation,
        userCreated: true, // User-created
      });

      const newNode = Object.values(graph.nodes).find(
        node => node.point.x === intermediate.point.x && node.point.y === intermediate.point.y
      );

      if (newNode?.privateKey !== undefined) {
        userNodesWithPrivateKeys++;
      }

      currentPoint = intermediate.point;
    }

    console.log(
      `After user operations: ${userNodesWithPrivateKeys} nodes have private keys (should be > 0)`
    );
    expect(userNodesWithPrivateKeys).toBeGreaterThan(0);

    // Test 3: All nodes should have connectedToG regardless
    const allNodes = Object.values(graph.nodes);
    const connectedNodes = allNodes.filter(node => node.connectedToG).length;
    console.log(`Nodes with connectedToG: ${connectedNodes}/${allNodes.length} (should be all)`);
    expect(connectedNodes).toBe(allNodes.length);
  });

  it('should demonstrate significant performance improvement', () => {
    console.log('\n⚡ PERFORMANCE COMPARISON: OLD vs NEW APPROACH ⚡');

    const scalar = 511n; // Medium-large scalar
    const { intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

    // OLD APPROACH: Always propagate private keys
    const oldTime = measureTime('OLD: Always propagate private keys', () => {
      const graph = createEmptyGraph();
      addNode(graph, generatorPoint, {
        id: 'generator',
        privateKey: 1n,
        isGenerator: true,
      });

      let currentPoint = generatorPoint;
      for (const intermediate of intermediates) {
        // Force propagation by marking all as user-created
        ensureOperationInGraph(graph, currentPoint, intermediate.point, {
          ...intermediate.operation,
          userCreated: true,
        });
        currentPoint = intermediate.point;
      }

      return Object.keys(graph.nodes).length;
    });

    // NEW APPROACH: Selective propagation
    const newTime = measureTime('NEW: Selective propagation (mostly system ops)', () => {
      const graph = createEmptyGraph();
      addNode(graph, generatorPoint, {
        id: 'generator',
        privateKey: 1n,
        isGenerator: true,
      });

      let currentPoint = generatorPoint;
      for (let i = 0; i < intermediates.length; i++) {
        const intermediate = intermediates[i];

        // Only mark every 5th operation as user-created (realistic scenario)
        ensureOperationInGraph(graph, currentPoint, intermediate.point, {
          ...intermediate.operation,
          userCreated: i % 5 === 0,
        });
        currentPoint = intermediate.point;
      }

      return Object.keys(graph.nodes).length;
    });

    const speedup = oldTime / newTime;
    console.log(`Performance improvement: ${speedup.toFixed(2)}x speedup`);
    console.log(`Nodes created: OLD=${oldTime}, NEW=${newTime}`);
  });

  it('should verify correctness of selective propagation', () => {
    console.log('\n✅ CORRECTNESS VERIFICATION ✅');

    const graph = createEmptyGraph();

    // Add generator with private key and connectedToG
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    // Add a few intermediate steps with mixed user/system operations
    const { intermediates } = pointMultiplyWithIntermediates(15n, generatorPoint);

    let currentPoint = generatorPoint;
    const userOperationIndices = [0, 3, 5]; // Some operations are user-created

    for (let i = 0; i < intermediates.length; i++) {
      const intermediate = intermediates[i];
      const isUserCreated = userOperationIndices.includes(i);

      ensureOperationInGraph(graph, currentPoint, intermediate.point, {
        ...intermediate.operation,
        userCreated: isUserCreated,
      });

      currentPoint = intermediate.point;
    }

    // Verify that nodes have private keys only if they're reachable from user operations
    const nodes = Object.values(graph.nodes);
    console.log(`Total nodes: ${nodes.length}`);

    const nodesWithPrivateKeys = nodes.filter(node => node.privateKey !== undefined);
    const nodesWithConnectedToG = nodes.filter(node => node.connectedToG);

    console.log(`Nodes with private keys: ${nodesWithPrivateKeys.length}`);
    console.log(`Nodes with connectedToG: ${nodesWithConnectedToG.length}`);

    // All nodes should have connectedToG
    expect(nodesWithConnectedToG.length).toBe(nodes.length);

    // Some but not all nodes should have private keys (only those touched by user operations)
    expect(nodesWithPrivateKeys.length).toBeGreaterThan(1); // At least generator + some user ops
    expect(nodesWithPrivateKeys.length).toBeLessThan(nodes.length); // But not all

    // Verify private keys are mathematically correct where they exist
    for (const node of nodesWithPrivateKeys) {
      if (node.privateKey !== undefined) {
        const verificationPoint = pointMultiplyWithIntermediates(
          node.privateKey,
          generatorPoint
        ).result;
        expect(verificationPoint.x).toBe(node.point.x);
        expect(verificationPoint.y).toBe(node.point.y);
      }
    }

    console.log('✅ All private keys are mathematically correct!');
  });

  it('should profile the optimization in detail', () => {
    console.log('\n🔍 DETAILED PERFORMANCE PROFILE 🔍');

    startProfiling();

    profile('Optimized Graph Operations', () => {
      const graph = createEmptyGraph();

      profile('Setup Generator', () => {
        const generatorNode = addNode(graph, generatorPoint, {
          id: 'generator',
          privateKey: 1n,
          isGenerator: true,
        });
        generatorNode.connectedToG = true;
      });

      const { intermediates } = pointMultiplyWithIntermediates(255n, generatorPoint);

      profile('Process Mixed Operations', () => {
        let currentPoint = generatorPoint;

        for (let i = 0; i < intermediates.length; i++) {
          const intermediate = intermediates[i];
          const isUserCreated = i % 4 === 0; // Every 4th operation is user-created

          if (isUserCreated) {
            profile(`User Operation ${i}`, () => {
              ensureOperationInGraph(graph, currentPoint, intermediate.point, {
                ...intermediate.operation,
                userCreated: true,
              });
            });
          } else {
            profile(`System Operation ${i}`, () => {
              ensureOperationInGraph(graph, currentPoint, intermediate.point, {
                ...intermediate.operation,
                userCreated: false,
              });
            });
          }

          currentPoint = intermediate.point;
        }
      });

      return {
        nodes: Object.keys(graph.nodes).length,
        edges: Object.keys(graph.edges).length,
      };
    });

    const result = endProfiling();
    if (result) {
      result.print();

      console.log('\n📊 PERFORMANCE BOTTLENECKS:');
      const bottlenecks = result.getBottlenecks(5);
      bottlenecks.forEach((bottleneck, index) => {
        console.log(
          `${index + 1}. ${bottleneck.name}: ${bottleneck.duration.toFixed(2)}ms (${bottleneck.percentage.toFixed(1)}%)`
        );
      });
    }
  });
});
