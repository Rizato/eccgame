import {
  type PointGraph,
  type SingleOperationPayload,
  type GraphEdge,
} from '../../../types/ecc';
import { findNodeByPoint, addNode, reverseOperation } from '../../../utils/graphOperations';

/**
 * Process batch operations with optimized BFS calls
 */
export function processBatchOperations(
  graph: PointGraph,
  operations: SingleOperationPayload[],
  mode?: string // Add mode parameter to prevent cross-contamination
): void {
  if (operations.length === 0) return;
  const veryFirstNode = findNodeByPoint(graph, operations[0].fromPoint);
  const veryLastNode = findNodeByPoint(graph, operations[operations.length - 1].fromPoint);
  const connectedToG = veryFirstNode?.connectedToG || veryLastNode?.connectedToG;
  for (let i = 0; i < operations.length; i++) {
    const { fromPoint, toPoint, operation, toPointPrivateKey } = operations[i];

    // Fast structure creation without BFS propagation
    let fromNode = findNodeByPoint(graph, fromPoint);
    if (!fromNode) {
      fromNode = addNode(graph, fromPoint, { label: 'Intermediate', connectedToG, mode });
    }

    let toNode = findNodeByPoint(graph, toPoint);
    if (!toNode) {
      const label = i == operations.length - 1 ? 'Batch Operation Result' : 'Intermediate';
      toNode = addNode(graph, toPoint, {
        label,
        connectedToG,
        privateKey: toPointPrivateKey,
        mode,
      });
    } else if (toPointPrivateKey !== undefined && toNode.privateKey === undefined) {
      // Update existing node with pre-calculated private key
      toNode.privateKey = toPointPrivateKey;
    }

    // Initialize edge arrays if they don't exist
    if (!graph.edges[fromNode.id]) {
      graph.edges[fromNode.id] = [];
    }
    if (!graph.edges[toNode.id]) {
      graph.edges[toNode.id] = [];
    }

    // Add forward edge
    const edgeId = `${fromNode.id}_to_${toNode.id}_by_operation_${operation.type}_${operation.value}`;
    if (!graph.edges[fromNode.id].find(e => e.id === edgeId)) {
      const forwardEdge: GraphEdge = {
        id: edgeId,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        operation,
      };
      graph.edges[fromNode.id].push(forwardEdge);

      // Add reverse edge
      const reversedOp = reverseOperation(operation);
      const reverseEdgeId = `${toNode.id}_to_${fromNode.id}_by_operation_${reversedOp.type}_${reversedOp.value}`;
      const reverseEdge: GraphEdge = {
        id: reverseEdgeId,
        fromNodeId: toNode.id,
        toNodeId: fromNode.id,
        operation: reversedOp,
      };
      graph.edges[toNode.id].push(reverseEdge);
    }
  }
}
