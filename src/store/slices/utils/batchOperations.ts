import {
  type PointGraph,
  type SingleOperationPayload,
  type GraphEdge,
  type EdgeListNode,
} from '../../../types/ecc';
import {
  findNodeByPoint,
  addNode,
  reverseOperation,
  findEdgeInList,
} from '../../../utils/graphOperations';

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
      // Update existing node  with pre-calculated private key
      toNode.privateKey = toPointPrivateKey;
    }

    // Update connectedToG status if needed
    if (connectedToG && !toNode.connectedToG) {
      toNode.connectedToG = true;
      // Check if this node is a challenge that just became connected
      if (toNode.isChallenge) {
        graph.connectedChallengeNodes.add(toNode.id);
      }
    }
    if (connectedToG && !fromNode.connectedToG) {
      fromNode.connectedToG = true;
      // Check if this node is a challenge that just became connected
      if (fromNode.isChallenge) {
        graph.connectedChallengeNodes.add(fromNode.id);
      }
    }

    // Initialize edge lists if they don't exist
    if (!graph.edges.has(fromNode.id)) {
      graph.edges.set(fromNode.id, null);
    }
    if (!graph.edges.has(toNode.id)) {
      graph.edges.set(toNode.id, null);
    }

    // Add forward edge
    const edgeId = `${fromNode.id}_to_${toNode.id}_by_operation_${operation.type}_${operation.value}`;
    const edgeHead = graph.edges.get(fromNode.id) || null;
    const existingEdge = findEdgeInList(edgeHead, edgeId);

    if (!existingEdge) {
      const forwardEdge: GraphEdge = {
        id: edgeId,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        operation,
      };

      // Prepend to linked list for O(1) insertion
      const newForwardNode: EdgeListNode = {
        val: forwardEdge,
        next: graph.edges.get(fromNode.id) || null,
      };
      graph.edges.set(fromNode.id, newForwardNode);

      // Add reverse edge
      const reversedOp = reverseOperation(operation);
      const reverseEdgeId = `${toNode.id}_to_${fromNode.id}_by_operation_${reversedOp.type}_${reversedOp.value}`;
      const reverseEdge: GraphEdge = {
        id: reverseEdgeId,
        fromNodeId: toNode.id,
        toNodeId: fromNode.id,
        operation: reversedOp,
      };

      // Prepend to linked list for O(1) insertion
      const newReverseNode: EdgeListNode = {
        val: reverseEdge,
        next: graph.edges.get(toNode.id) || null,
      };
      graph.edges.set(toNode.id, newReverseNode);
    }
  }
}
