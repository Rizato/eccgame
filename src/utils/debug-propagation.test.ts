import { describe, it, expect } from 'vitest';
import { getGeneratorPoint, pointMultiplyWithIntermediates } from './ecc';
import { createEmptyGraph, addNode, ensureOperationInGraph } from './graphOperations';

describe('Debug Private Key Propagation', () => {
  const generatorPoint = getGeneratorPoint();

  it('should debug why user operations are not getting private keys', () => {
    console.log('\n🔍 DEBUG: User Operation Private Key Propagation 🔍');

    const graph = createEmptyGraph();

    // Add generator with private key and connectedToG
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      label: 'Generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    console.log(
      `Generator: privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );

    const { intermediates } = pointMultiplyWithIntermediates(7n, generatorPoint);
    const firstIntermediate = intermediates[0];

    console.log('\n--- BEFORE USER OPERATION ---');
    console.log(
      `From node (generator): privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );

    // Add a user operation
    ensureOperationInGraph(graph, generatorPoint, firstIntermediate.point, {
      ...firstIntermediate.operation,
      userCreated: true,
    });

    console.log('\n--- AFTER USER OPERATION ---');
    const newNode = Object.values(graph.nodes).find(
      node =>
        node.point.x === firstIntermediate.point.x && node.point.y === firstIntermediate.point.y
    );

    console.log(
      `To node (new): privateKey=${newNode?.privateKey}, connectedToG=${newNode?.connectedToG}`
    );
    console.log(
      `From node (generator): privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );

    // Now try adding another user operation from the new node
    if (intermediates.length > 1) {
      const secondIntermediate = intermediates[1];

      console.log('\n--- BEFORE SECOND USER OPERATION ---');
      console.log(
        `From node (first intermediate): privateKey=${newNode?.privateKey}, connectedToG=${newNode?.connectedToG}`
      );

      ensureOperationInGraph(graph, firstIntermediate.point, secondIntermediate.point, {
        ...secondIntermediate.operation,
        userCreated: true,
      });

      console.log('\n--- AFTER SECOND USER OPERATION ---');
      const secondNode = Object.values(graph.nodes).find(
        node =>
          node.point.x === secondIntermediate.point.x && node.point.y === secondIntermediate.point.y
      );

      console.log(
        `To node (second): privateKey=${secondNode?.privateKey}, connectedToG=${secondNode?.connectedToG}`
      );
      console.log(
        `From node (first): privateKey=${newNode?.privateKey}, connectedToG=${newNode?.connectedToG}`
      );

      // The second operation should have a connectedToG mismatch scenario:
      // From node: has connectedToG but no privateKey
      // To node: no connectedToG initially
      // This should trigger private key propagation
    }

    console.log('\n--- FINAL STATE ---');
    const allNodes = Object.values(graph.nodes);
    allNodes.forEach((node, index) => {
      console.log(
        `Node ${index}: privateKey=${node.privateKey}, connectedToG=${node.connectedToG}, isGenerator=${node.isGenerator}`
      );
    });
  });

  it('should test the specific connectedToG mismatch scenario', () => {
    console.log('\n🎯 TESTING SPECIFIC connectedToG MISMATCH SCENARIO 🎯');

    const graph = createEmptyGraph();

    // Create a scenario where we have a connectedToG mismatch

    // Step 1: Add generator
    const generatorNode = addNode(graph, generatorPoint, {
      id: 'generator',
      privateKey: 1n,
      isGenerator: true,
    });
    generatorNode.connectedToG = true;

    // Step 2: Add an isolated point (not connected to G yet)
    const { result: targetPoint } = pointMultiplyWithIntermediates(5n, generatorPoint);
    const isolatedNode = addNode(graph, targetPoint, {
      id: 'isolated',
      label: 'Isolated Point',
      // No privateKey, no connectedToG
    });

    console.log('BEFORE connecting isolated node:');
    console.log(
      `Generator: privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );
    console.log(
      `Isolated: privateKey=${isolatedNode.privateKey}, connectedToG=${isolatedNode.connectedToG}`
    );

    // Step 3: Create a user operation that connects them
    // This should detect the connectedToG mismatch and propagate private keys
    ensureOperationInGraph(graph, generatorPoint, targetPoint, {
      type: 'multiply',
      description: '×5',
      value: '5',
      userCreated: true,
    });

    console.log('\nAFTER user operation connecting them:');
    console.log(
      `Generator: privateKey=${generatorNode.privateKey}, connectedToG=${generatorNode.connectedToG}`
    );
    console.log(
      `Isolated (now connected): privateKey=${isolatedNode.privateKey}, connectedToG=${isolatedNode.connectedToG}`
    );

    // The isolated node should now have both a private key and connectedToG
    expect(isolatedNode.connectedToG).toBe(true);
    expect(isolatedNode.privateKey).toBeDefined();

    if (isolatedNode.privateKey) {
      console.log(`✅ Private key propagation worked! Key: ${isolatedNode.privateKey}`);
    } else {
      console.log('❌ Private key propagation failed');
    }
  });
});
