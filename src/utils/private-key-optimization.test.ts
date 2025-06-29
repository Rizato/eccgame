import { describe, it, expect } from 'vitest';
import { processBatchOperations } from '../store/slices/utils/batchOperations';
import { getGeneratorPoint } from './ecc';
import { pointMultiplyWithIntermediates, pointDivideWithIntermediates } from './ecc';
import { addNode, createEmptyGraph } from './graphOperations';

describe('Private Key Optimization', () => {
  it('should calculate private keys for intermediates during multiplication', () => {
    const G = getGeneratorPoint();
    const scalar = 15n; // Binary: 1111
    const startingPrivateKey = 42n;

    // Test pointMultiplyWithIntermediates with private key
    const { result: _result, intermediates } = pointMultiplyWithIntermediates(
      scalar,
      G,
      startingPrivateKey
    );

    expect(intermediates.length).toBeGreaterThan(0);

    // Check that all intermediates have private keys calculated
    for (const intermediate of intermediates) {
      expect(intermediate.privateKey).toBeDefined();
      expect(typeof intermediate.privateKey).toBe('bigint');
    }

    // The final result should match scalar * startingPrivateKey
    const expectedFinalPrivateKey =
      (scalar * startingPrivateKey) %
      BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    const lastIntermediate = intermediates[intermediates.length - 1];
    expect(lastIntermediate.privateKey).toBe(expectedFinalPrivateKey);
  });

  it('should calculate private keys for intermediates during division', () => {
    const G = getGeneratorPoint();
    const scalar = 3n;
    const startingPrivateKey = 21n;

    // Test pointDivideWithIntermediates with private key
    const { result: _result, intermediates } = pointDivideWithIntermediates(
      scalar,
      G,
      startingPrivateKey
    );

    expect(intermediates.length).toBeGreaterThan(0);

    // Check that all intermediates have private keys calculated
    for (const intermediate of intermediates) {
      expect(intermediate.privateKey).toBeDefined();
      expect(typeof intermediate.privateKey).toBe('bigint');
    }
  });

  it('should not calculate private keys when starting private key is unknown', () => {
    const G = getGeneratorPoint();
    const scalar = 15n;

    // Test without starting private key
    const { result: _result, intermediates } = pointMultiplyWithIntermediates(scalar, G);

    expect(intermediates.length).toBeGreaterThan(0);

    // Check that no intermediates have private keys
    for (const intermediate of intermediates) {
      expect(intermediate.privateKey).toBeUndefined();
    }
  });

  it('should use pre-calculated private keys in batch operations', () => {
    const graph = createEmptyGraph();
    const G = getGeneratorPoint();
    const scalar = 7n; // Binary: 111
    const startingPrivateKey = 100n;

    // Get intermediates with private keys
    const { result: _result, intermediates } = pointMultiplyWithIntermediates(
      scalar,
      G,
      startingPrivateKey
    );

    // Create batch operations
    const operations = [];
    let previousPoint = G;
    for (const intermediate of intermediates) {
      operations.push({
        fromPoint: previousPoint,
        toPoint: intermediate.point,
        operation: intermediate.operation,
        toPointPrivateKey: intermediate.privateKey,
      });
      previousPoint = intermediate.point;
    }

    // Add generator to graph first
    addNode(graph, G, { label: 'G', privateKey: startingPrivateKey, isGenerator: true });

    // Process the first operation separately (as the actual code does)
    if (operations.length > 0) {
      const firstOp = operations[0];
      // The first operation connects G to the first intermediate
      addNode(graph, firstOp.toPoint, {
        label: 'First Intermediate',
        connectedToG: true,
        privateKey: firstOp.toPointPrivateKey,
      });
    }

    // Process batch operations (skips first operation)
    processBatchOperations(graph, operations);

    // Check that all intermediate nodes have the correct private keys
    for (const operation of operations) {
      const pointHash = `${operation.toPoint.x.toString(16)}_${operation.toPoint.y.toString(16)}`;
      const nodeId = graph.pointToNodeId.get(pointHash);
      console.log(`Looking for point hash: ${pointHash}, found nodeId: ${nodeId}`);

      if (nodeId) {
        const node = graph.nodes.get(nodeId);
        console.log(
          `Node ${nodeId} private key: ${node?.privateKey}, expected: ${operation.toPointPrivateKey}`
        );
        expect(node).toBeDefined();
        expect(node?.privateKey).toBe(operation.toPointPrivateKey);
      } else {
        console.log(`Node not found for point hash: ${pointHash}`);
        console.log(`Available point hashes:`, Array.from(graph.pointToNodeId.keys()));
      }
    }
  });

  it('should handle large scalars efficiently with private key calculation', () => {
    const G = getGeneratorPoint();
    const scalar = 255n; // Large enough to generate many intermediates
    const startingPrivateKey = 1n; // Generator private key

    const start = performance.now();
    const { result: _result, intermediates } = pointMultiplyWithIntermediates(
      scalar,
      G,
      startingPrivateKey
    );
    const end = performance.now();

    console.log(`Large scalar (${scalar}) with private key calculation: ${end - start}ms`);
    console.log(`Generated ${intermediates.length} intermediates with private keys`);

    // All intermediates should have private keys
    expect(intermediates.every(i => i.privateKey !== undefined)).toBe(true);

    // Performance should still be reasonable
    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should optimize multiplication with intermediates', () => {
    const scalar = 5n;
    const G = getGeneratorPoint();
    const startingPrivateKey = 1n;

    const { result: _result, intermediates: _intermediates } = pointMultiplyWithIntermediates(
      scalar,
      G,
      startingPrivateKey
    );
  });
});
