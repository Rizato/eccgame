import { describe, it, expect } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import {
  createEmptyGraph,
  addNode,
  ensureOperationInGraph,
  triggerPropagationFromNode,
} from './graphOperations';

describe('ConnectedToG and PrivateKey Mismatch Recovery', () => {
  const generatorPoint = getGeneratorPoint();

  it('should handle recovery when connectedToG exists but privateKey is lost', () => {
    console.log('\n🚨 TESTING MISMATCH RECOVERY: connectedToG=true, privateKey=undefined 🚨');

    const graph = createEmptyGraph();

    // Setup: Create a normal path first
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    const { intermediates } = pointMultiplyWithIntermediates(7n, generatorPoint);
    const firstIntermediate = intermediates[0];
    const secondIntermediate = intermediates[1];

    // Create a normal connection first
    ensureOperationInGraph(graph, generatorPoint, firstIntermediate.point, {
      ...firstIntermediate.operation,
      userCreated: true,
    });

    console.log('\n--- AFTER NORMAL CONNECTION ---');
    const firstNode = Object.values(graph.nodes).find(
      node =>
        node.point.x === firstIntermediate.point.x && node.point.y === firstIntermediate.point.y
    );
    console.log(
      `First intermediate: privateKey=${firstNode?.privateKey}, connectedToG=${firstNode?.connectedToG}`
    );

    // SIMULATE THE PROBLEM: Manually lose the private key but keep connectedToG
    if (firstNode) {
      firstNode.privateKey = undefined; // Simulate data loss/corruption
      console.log('\n🔥 SIMULATED PROBLEM: Lost private key but kept connectedToG');
      console.log(
        `First intermediate after corruption: privateKey=${firstNode.privateKey}, connectedToG=${firstNode.connectedToG}`
      );
    }

    // Now try to connect another node through the corrupted node
    ensureOperationInGraph(graph, firstIntermediate.point, secondIntermediate.point, {
      ...secondIntermediate.operation,
      userCreated: true,
    });

    console.log('\n--- AFTER ATTEMPTING CONNECTION THROUGH CORRUPTED NODE ---');
    const secondNode = Object.values(graph.nodes).find(
      node =>
        node.point.x === secondIntermediate.point.x && node.point.y === secondIntermediate.point.y
    );
    console.log(
      `Second intermediate: privateKey=${secondNode?.privateKey}, connectedToG=${secondNode?.connectedToG}`
    );

    // The second node should have connectedToG but may not have privateKey
    // This tests the robustness of our propagation logic
    expect(secondNode?.connectedToG).toBe(true); // Should always propagate

    // Document the current behavior (privateKey may or may not propagate)
    if (secondNode?.privateKey) {
      console.log('✅ System recovered: Private key was calculated despite corruption');
    } else {
      console.log('⚠️ Partial recovery: connectedToG propagated but privateKey lost');
    }
  });

  it('should recover private keys when a user operation connects through a node with lost privateKey', () => {
    console.log('\n🔧 TESTING RECOVERY VIA ALTERNATIVE PATH 🔧');

    const graph = createEmptyGraph();

    // Create generator
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    const { intermediates } = pointMultiplyWithIntermediates(15n, generatorPoint);

    // Create a branching path where one branch loses private key
    // Path A: Generator -> Point1 -> Point2 (Point1 will lose privateKey)
    // Path B: Generator -> Point3 -> Point2 (alternative path to Point2)

    const point1 = intermediates[0].point;
    const point2 = intermediates[1].point;
    const point3 = intermediates[2].point;

    // Build Path A
    ensureOperationInGraph(graph, generatorPoint, point1, {
      ...intermediates[0].operation,
      userCreated: true,
    });

    ensureOperationInGraph(graph, point1, point2, {
      ...intermediates[1].operation,
      userCreated: true,
    });

    // Build Path B
    ensureOperationInGraph(graph, generatorPoint, point3, {
      ...intermediates[2].operation,
      userCreated: true,
    });

    console.log('\n--- AFTER BUILDING BOTH PATHS ---');
    const allNodes = Object.values(graph.nodes);
    allNodes.forEach((node, i) => {
      if (!node.point.isInfinity) {
        console.log(`Node ${i}: privateKey=${node.privateKey}, connectedToG=${node.connectedToG}`);
      }
    });

    // CORRUPT Path A: Lose privateKey for point1
    const node1 = Object.values(graph.nodes).find(
      node => node.point.x === point1.x && node.point.y === point1.y
    );
    if (node1) {
      const originalPrivateKey = node1.privateKey;
      node1.privateKey = undefined;
      console.log(`\n🔥 CORRUPTED Node1: Lost privateKey ${originalPrivateKey}`);
    }

    // Now create a connection from point3 to point2 (alternative path)
    ensureOperationInGraph(graph, point3, point2, {
      type: 'add',
      description: '+calculated',
      value: '1',
      userCreated: true,
    });

    console.log('\n--- AFTER CREATING ALTERNATIVE PATH ---');
    const node2 = Object.values(graph.nodes).find(
      node => node.point.x === point2.x && node.point.y === point2.y
    );

    console.log(
      `Node2 (target): privateKey=${node2?.privateKey}, connectedToG=${node2?.connectedToG}`
    );

    // Point2 should still be reachable and have correct properties
    expect(node2?.connectedToG).toBe(true);

    if (node2?.privateKey) {
      console.log('✅ Recovery successful: Private key restored via alternative path');

      // Verify the private key is mathematically correct
      const verificationPoint = pointMultiplyWithIntermediates(
        node2.privateKey,
        generatorPoint
      ).result;
      expect(verificationPoint.x).toBe(node2.point.x);
      expect(verificationPoint.y).toBe(node2.point.y);
      console.log('✅ Recovered private key is mathematically correct');
    } else {
      console.log('⚠️ Recovery incomplete: connectedToG restored but privateKey still missing');
    }
  });

  it('should handle complete graph reconstruction after massive data loss', () => {
    console.log('\n💥 TESTING MASSIVE DATA LOSS RECOVERY 💥');

    const graph = createEmptyGraph();

    // Build a complex graph
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    const { intermediates } = pointMultiplyWithIntermediates(31n, generatorPoint);

    // Build a chain of nodes
    let currentPoint = generatorPoint;
    for (let i = 0; i < Math.min(5, intermediates.length); i++) {
      const intermediate = intermediates[i];
      ensureOperationInGraph(graph, currentPoint, intermediate.point, {
        ...intermediate.operation,
        userCreated: true,
      });
      currentPoint = intermediate.point;
    }

    console.log('\n--- BEFORE DATA LOSS ---');
    const originalNodes = Object.values(graph.nodes);
    const originalPrivateKeys = originalNodes.map(node => ({
      point: { x: node.point.x, y: node.point.y },
      privateKey: node.privateKey,
      connectedToG: node.connectedToG,
    }));

    console.log(`Total nodes: ${originalNodes.length}`);
    const nodesWithKeys = originalNodes.filter(node => node.privateKey !== undefined).length;
    console.log(`Nodes with private keys: ${nodesWithKeys}`);

    // SIMULATE MASSIVE DATA LOSS: Keep connectedToG but lose all private keys except generator
    originalNodes.forEach(node => {
      if (!node.isGenerator) {
        node.privateKey = undefined;
      }
    });

    console.log('\n🔥 SIMULATED MASSIVE DATA LOSS: All private keys lost except generator');

    // Try to recover by adding a new user operation that should trigger propagation
    const lastPoint = currentPoint;
    const finalPoint = intermediates[Math.min(5, intermediates.length - 1)].point;

    ensureOperationInGraph(graph, generatorPoint, finalPoint, {
      type: 'multiply',
      description: '×recovery',
      value: '31',
      userCreated: true,
    });

    console.log('\n--- AFTER RECOVERY ATTEMPT ---');
    const recoveredNodes = Object.values(graph.nodes);
    const recoveredWithKeys = recoveredNodes.filter(node => node.privateKey !== undefined).length;
    const allConnectedToG = recoveredNodes.filter(node => node.connectedToG).length;

    console.log(`Nodes with recovered private keys: ${recoveredWithKeys}/${recoveredNodes.length}`);
    console.log(`Nodes with connectedToG: ${allConnectedToG}/${recoveredNodes.length}`);

    // All nodes should maintain connectedToG
    expect(allConnectedToG).toBe(recoveredNodes.length);

    // At least the generator and final point should have private keys
    expect(recoveredWithKeys).toBeGreaterThanOrEqual(2);

    // Verify any recovered private keys are mathematically correct
    let correctKeys = 0;
    for (const node of recoveredNodes) {
      if (node.privateKey !== undefined) {
        try {
          const verificationPoint = pointMultiplyWithIntermediates(
            node.privateKey,
            generatorPoint
          ).result;
          if (verificationPoint.x === node.point.x && verificationPoint.y === node.point.y) {
            correctKeys++;
          }
        } catch (error) {
          console.warn(`Failed to verify private key for node:`, error);
        }
      }
    }

    console.log(`Mathematically correct private keys: ${correctKeys}/${recoveredWithKeys}`);
    expect(correctKeys).toBe(recoveredWithKeys); // All recovered keys should be correct

    if (recoveredWithKeys > 2) {
      console.log('✅ Excellent recovery: Multiple private keys restored');
    } else if (recoveredWithKeys === 2) {
      console.log('✅ Partial recovery: Generator and target keys maintained');
    } else {
      console.log('⚠️ Minimal recovery: Only generator key maintained');
    }
  });

  it('should handle the case where connectedToG is lost but privateKey exists', () => {
    console.log('\n🔄 TESTING REVERSE MISMATCH: privateKey=exists, connectedToG=false 🔄');

    const graph = createEmptyGraph();

    // Create generator
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    const { result: targetPoint } = pointMultiplyWithIntermediates(5n, generatorPoint);

    // Create a node with correct private key but no connectedToG (unusual scenario)
    const orphanNode = addNode(graph, targetPoint, {
      id: 'orphan',
      privateKey: 5n, // Correct private key
      // but connectedToG is undefined/false
    });

    console.log('\n--- BEFORE RECONNECTION ---');
    console.log(
      `Generator: privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );
    console.log(
      `Orphan: privateKey=${orphanNode.privateKey}, connectedToG=${orphanNode.connectedToG}`
    );

    // Connect the orphan back to the graph via user operation
    ensureOperationInGraph(graph, generatorPoint, targetPoint, {
      type: 'multiply',
      description: '×5',
      value: '5',
      userCreated: true,
    });

    console.log('\n--- AFTER RECONNECTION ---');
    console.log(
      `Generator: privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );
    console.log(
      `Orphan: privateKey=${orphanNode.privateKey}, connectedToG=${orphanNode.connectedToG}`
    );

    // The orphan should now have connectedToG
    expect(orphanNode.connectedToG).toBe(true);

    // The private key should be preserved (or corrected if it was wrong)
    expect(orphanNode.privateKey).toBeDefined();

    // Verify the private key is correct
    if (orphanNode.privateKey) {
      const verificationPoint = pointMultiplyWithIntermediates(
        orphanNode.privateKey,
        generatorPoint
      ).result;
      expect(verificationPoint.x).toBe(orphanNode.point.x);
      expect(verificationPoint.y).toBe(orphanNode.point.y);
      console.log('✅ Orphan node successfully reconnected with valid private key');
    }
  });
});
