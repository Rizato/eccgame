import type { ECPoint, Operation, PointGraph, GraphNode } from '../types/ecc';
import {
  addNode,
  addEdge,
  findNodeByPoint,
  getAllConnectedEdges,
  reverseOperation,
} from './pointGraph';
import { calculateKeyFromOperations } from './privateKeyCalculation';
import { pointMultiply, getGeneratorPoint } from './ecc';

/**
 * Ensure an operation (and its result) are added to the graph
 * This should be called for EVERY operation, regardless of source
 */
export function ensureOperationInGraph(
  graph: PointGraph,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation
): void {
  // Add the from node if it doesn't exist
  let fromNode = findNodeByPoint(graph, fromPoint);
  if (!fromNode) {
    fromNode = addNode(graph, fromPoint, {
      label: 'Point',
    });
  }

  // Add the to node if it doesn't exist
  let toNode = findNodeByPoint(graph, toPoint);
  if (!toNode) {
    toNode = addNode(graph, toPoint, {
      label: `Point from ${operation.description}`,
    });
  }

  // Add the edge between them
  addEdge(graph, fromNode.id, toNode.id, operation);

  // Propagate private keys if one node has a key and the other doesn't
  propagatePrivateKeyFromNodes(graph, fromNode, toNode, operation);
}

/**
 * Verify that a private key generates the correct public key for a given point
 */
function verifyPrivateKeyForPoint(privateKey: bigint, point: ECPoint): boolean {
  try {
    if (point.isInfinity) {
      // Point at infinity should have private key 0 (but this is edge case)
      return privateKey === 0n;
    }

    const generatedPoint = pointMultiply(privateKey, getGeneratorPoint());
    return generatedPoint.x === point.x && generatedPoint.y === point.y;
  } catch {
    return false;
  }
}

/**
 * Propagate private key between two nodes if one has a key and the other doesn't
 */
export function propagatePrivateKeyFromNodes(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode,
  operation: Operation
): void {
  // Exit if they both have no keys
  if (fromNode.privateKey === undefined && toNode.privateKey === undefined) {
    return;
  }

  // If both nodes have keys, verify they are correct and consistent
  if (fromNode.privateKey !== undefined && toNode.privateKey !== undefined) {
    // First verify that both private keys are correct for their points
    const fromKeyValid = verifyPrivateKeyForPoint(fromNode.privateKey, fromNode.point);
    const toKeyValid = verifyPrivateKeyForPoint(toNode.privateKey, toNode.point);

    if (!fromKeyValid) {
      console.warn('fromNode has invalid private key for its point');
    }

    if (!toKeyValid) {
      console.warn('toNode has invalid private key for its point');
    }

    // If both keys are valid, check consistency with the operation
    if (fromKeyValid && toKeyValid) {
      try {
        const expectedToKey = calculateKeyFromOperations([operation], fromNode.privateKey);
        if (toNode.privateKey !== expectedToKey) {
          console.warn(
            'Valid private keys but inconsistent with operation. This may be due to bundled operations.'
          );
          // Don't overwrite if both keys are individually valid
        }
      } catch (error) {
        console.warn('Failed to verify operation consistency:', error);
      }
    } else if (fromKeyValid && !toKeyValid) {
      // fromNode is correct, toNode is wrong - fix toNode
      try {
        const correctedToKey = calculateKeyFromOperations([operation], fromNode.privateKey);
        if (verifyPrivateKeyForPoint(correctedToKey, toNode.point)) {
          console.warn('Correcting invalid toNode private key based on valid fromNode');
          toNode.privateKey = correctedToKey;
          propagatePrivateKeyRecursively(graph, toNode.id, new Set([fromNode.id]));
        }
      } catch (error) {
        console.warn('Failed to correct toNode private key:', error);
      }
    } else if (!fromKeyValid && toKeyValid) {
      // toNode is correct, fromNode is wrong - fix fromNode
      try {
        const reverseOp = reverseOperation(operation);
        const correctedFromKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
        if (verifyPrivateKeyForPoint(correctedFromKey, fromNode.point)) {
          console.warn('Correcting invalid fromNode private key based on valid toNode');
          fromNode.privateKey = correctedFromKey;
          propagatePrivateKeyRecursively(graph, fromNode.id, new Set([toNode.id]));
        }
      } catch (error) {
        console.warn('Failed to correct fromNode private key:', error);
      }
    }
    return;
  }

  // If fromNode has a private key and toNode doesn't, calculate toNode's key
  if (fromNode.privateKey !== undefined && toNode.privateKey === undefined) {
    try {
      const calculatedKey = calculateKeyFromOperations([operation], fromNode.privateKey);
      // Verify the calculated key is correct before setting it
      if (verifyPrivateKeyForPoint(calculatedKey, toNode.point)) {
        toNode.privateKey = calculatedKey;
        // Recursively propagate from toNode, but add fromNode to visited already
        propagatePrivateKeyRecursively(graph, toNode.id, new Set([fromNode.id]));
      } else {
        console.warn('Calculated private key does not match toNode point - not setting');
      }
    } catch (error) {
      console.warn('Failed to calculate private key from fromNode to toNode:', error);
    }
  }
  // If toNode has a private key and fromNode doesn't, calculate fromNode's key
  else if (toNode.privateKey !== undefined && fromNode.privateKey === undefined) {
    try {
      const reverseOp = reverseOperation(operation);
      const calculatedKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
      // Verify the calculated key is correct before setting it
      if (verifyPrivateKeyForPoint(calculatedKey, fromNode.point)) {
        fromNode.privateKey = calculatedKey;
        // Recursively propagate from fromNode, but add toNode to visited already
        propagatePrivateKeyRecursively(graph, fromNode.id, new Set([toNode.id]));
      } else {
        console.warn('Calculated private key does not match fromNode point - not setting');
      }
    } catch (error) {
      console.warn('Failed to calculate private key from toNode to fromNode:', error);
    }
  }
}

/**
 * Recursively propagate private keys from a node to all its connected nodes
 */
function propagatePrivateKeyRecursively(
  graph: PointGraph,
  nodeId: string,
  visited: Set<string>
): void {
  const node = graph.nodes[nodeId];
  if (!node || node.privateKey === undefined || visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);
  const connections = getAllConnectedEdges(graph, nodeId);

  for (const { edge, direction } of connections) {
    const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
    const connectedNode = graph.nodes[connectedNodeId];

    // Skip if already visited or if the connected node already has a private key
    if (visited.has(connectedNodeId) || !connectedNode || connectedNode.privateKey !== undefined) {
      continue;
    }

    try {
      let calculatedKey: bigint;

      if (direction === 'outgoing') {
        // Going from current node to connected node
        calculatedKey = calculateKeyFromOperations([edge.operation], node.privateKey);
      } else {
        // Going from connected node to current node (reverse direction)
        const reverseOp = reverseOperation(edge.operation);
        calculatedKey = calculateKeyFromOperations([reverseOp], node.privateKey);
      }

      connectedNode.privateKey = calculatedKey;
      // Continue propagating from the newly calculated node
      propagatePrivateKeyRecursively(graph, connectedNodeId, visited);
    } catch (error) {
      console.warn(`Failed to calculate private key for node ${connectedNodeId}:`, error);
    }
  }
}
