import type { ECPoint, Operation, PointGraph } from '../types/ecc';
import { addNode, addEdge, findNodeByPoint } from './pointGraph';
import { updateAllPrivateKeys } from './graphPrivateKeyCalculation';

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

  // Update all private keys in the graph
  updateAllPrivateKeys(graph);
}
