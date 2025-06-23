import {
  OperationType,
  type PointGraph,
  type SingleOperationPayload,
  type Operation,
} from '../../../types/ecc';
import { pointNegate } from '../../../utils/ecc';
import { findNodeByPoint, addNode } from '../../../utils/graphOperations';

/**
 * Process batch operations with optimized BFS calls
 */
export function processBatchOperations(
  graph: PointGraph,
  operations: SingleOperationPayload[]
): void {
  if (operations.length === 0) return;
  const veryFirstNode = findNodeByPoint(graph, operations[0].fromPoint);
  const veryLastNode = findNodeByPoint(graph, operations[operations.length - 1].fromPoint);
  const connectedToG = veryFirstNode?.connectedToG || veryLastNode?.connectedToG;
  for (let i = 1; i < operations.length; i++) {
    const { fromPoint, toPoint, operation } = operations[i];

    // Fast structure creation without BFS propagation
    let fromNode = findNodeByPoint(graph, fromPoint);
    if (!fromNode) {
      fromNode = addNode(graph, fromPoint, { label: 'Intermediate', connectedToG });
    }

    let toNode = findNodeByPoint(graph, toPoint);
    if (!toNode) {
      const label = i == operations.length - 1 ? 'Batch Operation Result' : 'Intermediate';
      toNode = addNode(graph, toPoint, { label, connectedToG });
    }

    // Add the edge
    const edgeId = `${fromNode.id}_to_${toNode.id}_by_operation_${operation.type}_${operation.value}`;
    if (!graph.edges[edgeId]) {
      graph.edges[edgeId] = {
        id: edgeId,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        operation,
      };
    }

    // Add negation without propagation
    const negatedPoint = pointNegate(toPoint);
    let negatedNode = findNodeByPoint(graph, negatedPoint);
    if (!negatedNode) {
      negatedNode = addNode(graph, negatedPoint, { label: 'Negated', connectedToG });
    }

    // Add negation edge
    const negateOp: Operation = {
      type: OperationType.NEGATE,
      description: '±',
      value: '',
      userCreated: false,
    };
    const negateEdgeId = `${toNode.id}_to_${negatedNode.id}_by_operation_${negateOp.type}_${negateOp.value}`;
    if (!graph.edges[negateEdgeId]) {
      graph.edges[negateEdgeId] = {
        id: negateEdgeId,
        fromNodeId: toNode.id,
        toNodeId: negatedNode.id,
        operation: negateOp,
      };
    }
  }
}
