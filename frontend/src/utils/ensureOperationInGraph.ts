import type { ECPoint, Operation, PointGraph, GraphNode } from '../types/ecc';
import {
  addNode,
  addEdge,
  findNodeByPoint,
  getAllConnectedEdges,
  reverseOperation,
} from './pointGraph';
import { calculateKeyFromOperations } from './privateKeyCalculation';

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
 * Propagate private key between two nodes if one has a key and the other doesn't
 */
function propagatePrivateKeyFromNodes(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode,
  operation: Operation
): void {
  // Exit if they both have no keys, or both have keys
  if (
    (fromNode.privateKey === undefined && toNode.privateKey === undefined) ||
    (fromNode.privateKey !== undefined && toNode.privateKey !== undefined)
  ) {
    return;
  }

  // If fromNode has a private key and toNode doesn't, calculate toNode's key
  if (fromNode.privateKey !== undefined && toNode.privateKey === undefined) {
    try {
      toNode.privateKey = calculateKeyFromOperations([operation], fromNode.privateKey);
      // Recursively propagate from toNode, but add fromNode to visited already
      propagatePrivateKeyRecursively(graph, toNode.id, new Set([fromNode.id]));
    } catch (error) {
      console.warn('Failed to calculate private key from fromNode to toNode:', error);
    }
  }
  // If toNode has a private key and fromNode doesn't, calculate fromNode's key
  else if (toNode.privateKey !== undefined && fromNode.privateKey === undefined) {
    try {
      const reverseOp = reverseOperation(operation);
      fromNode.privateKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
      // Recursively propagate from fromNode, but add toNode to visited already
      propagatePrivateKeyRecursively(graph, fromNode.id, new Set([toNode.id]));
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
