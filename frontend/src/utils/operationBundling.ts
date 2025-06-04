import { calculateKeyFromOperations } from './privateKeyCalculation';
import { pointToHash } from './pointGraph';
import type {
  Operation,
  GraphEdge,
  GraphNode,
  PointGraph,
  SavedPoint,
  ECPoint,
} from '../types/ecc';

/**
 * Check if a point is a saved point
 */
export function isPointSaved(point: ECPoint, savedPoints: SavedPoint[]): boolean {
  const pointHash = pointToHash(point);
  return savedPoints.some(savedPoint => pointToHash(savedPoint.point) === pointHash);
}

/**
 * Check if a node represents a saved point
 */
export function isNodeSaved(node: GraphNode, savedPoints: SavedPoint[]): boolean {
  return isPointSaved(node.point, savedPoints);
}

/**
 * Check if a node is a base point (generator or challenge)
 */
function isBaseNode(node: GraphNode): boolean {
  return node.isGenerator === true || node.isChallenge === true;
}

/**
 * Traverse backwards from a point to find the path to the nearest saved/base point
 * Returns the operations in the order they were performed (oldest first)
 */
function findPathToNearestSavedPoint(
  graph: PointGraph,
  startNodeId: string,
  savedPoints: SavedPoint[]
): { operations: Operation[]; targetNodeId: string } | null {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: Operation[]; pathNodeIds: string[] }> = [
    { nodeId: startNodeId, path: [], pathNodeIds: [startNodeId] },
  ];
  visited.add(startNodeId);

  while (queue.length > 0) {
    const { nodeId: currentNodeId, path, pathNodeIds } = queue.shift()!;
    const currentNode = graph.nodes[currentNodeId];

    if (!currentNode) continue;

    // Check if this is a saved point or base point (but not the starting point)
    if (
      currentNodeId !== startNodeId &&
      (isNodeSaved(currentNode, savedPoints) || isBaseNode(currentNode))
    ) {
      // Found the target - return path in correct order (oldest operations first)
      return {
        operations: path.reverse(), // Reverse because we traced backwards
        targetNodeId: currentNodeId,
      };
    }

    // Find all incoming edges to continue tracing backwards
    const incomingEdges = Object.values(graph.edges).filter(
      edge => edge.toNodeId === currentNodeId
    );

    for (const edge of incomingEdges) {
      if (!visited.has(edge.fromNodeId)) {
        visited.add(edge.fromNodeId);
        queue.push({
          nodeId: edge.fromNodeId,
          path: [...path, edge.operation],
          pathNodeIds: [edge.fromNodeId, ...pathNodeIds],
        });
      }
    }
  }

  return null; // No path to a saved/base point found
}

/**
 * Create a bundled edge when saving a point
 * Only creates an edge for the actual path that was taken to reach this point
 */
export function createBundledEdgeForSavedPoint(
  graph: PointGraph,
  savedPointNodeId: string,
  savedPoints: SavedPoint[]
): GraphEdge | null {
  const pathInfo = findPathToNearestSavedPoint(graph, savedPointNodeId, savedPoints);

  if (!pathInfo || pathInfo.operations.length === 0) {
    return null; // No bundleable path found
  }

  const { operations, targetNodeId } = pathInfo;

  // Only bundle if there are multiple operations
  if (operations.length === 1) {
    return null; // Single operations don't need bundling
  }

  // Create bundled edge from the target point to the saved point
  const scalar = computeOperationScalar(operations);
  const scalarOperation = createScalarOperation(operations, scalar);

  return {
    id: `bundled_save_${targetNodeId}_to_${savedPointNodeId}`,
    fromNodeId: targetNodeId,
    toNodeId: savedPointNodeId,
    operation: scalarOperation,
    isBundled: true,
    bundleCount: BigInt(operations.length),
  };
}

/**
 * Compute the scalar value of a sequence of operations by applying them starting from 1n
 */
function computeOperationScalar(operations: Operation[]): bigint {
  try {
    return calculateKeyFromOperations(operations, 1n);
  } catch (error) {
    console.warn('Failed to compute operation scalar:', error);
    return 1n;
  }
}

/**
 * Create a scalar operation from bundled operations
 */
function createScalarOperation(operations: Operation[], scalar: bigint): Operation {
  const operationIds = operations.map(op => op.id).join('_');
  return {
    id: `scalar_${operationIds}`,
    type: 'add',
    description: `+${scalar.toString()}`,
    value: scalar.toString(),
  };
}

/**
 * Add a bundled edge to the graph for a newly saved point
 * This replaces the individual operation chain with an optimized edge
 */
export function addBundledEdgeForNewSave(
  graph: PointGraph,
  savedPointNodeId: string,
  savedPoints: SavedPoint[]
): void {
  const bundledEdge = createBundledEdgeForSavedPoint(graph, savedPointNodeId, savedPoints);

  if (bundledEdge) {
    // Add the bundled edge to the graph
    graph.edges[bundledEdge.id] = bundledEdge;

    // Optionally: Remove the individual edges that are now bundled
    // This is where we could clean up the intermediate nodes/edges if desired
    // For now, we'll keep them to maintain the full operation history
  }
}

// Legacy functions for backwards compatibility with existing tests
// These are the old implementations that will be gradually phased out

/**
 * @deprecated Use createBundledEdgeForSavedPoint instead
 */
export function createBundledEdges(graph: PointGraph, savedPoints: SavedPoint[]): GraphEdge[] {
  // Return empty array - this old approach is being phased out
  return [];
}

/**
 * @deprecated Use addBundledEdgeForNewSave instead
 */
export function optimizeGraphWithBundling(
  graph: PointGraph,
  savedPoints: SavedPoint[]
): PointGraph {
  // Return the graph unchanged - optimization now happens at save time
  return graph;
}
