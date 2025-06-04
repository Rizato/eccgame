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
 * Find paths between saved points and bundle operations along them
 */
export function createBundledEdges(graph: PointGraph, savedPoints: SavedPoint[]): GraphEdge[] {
  const bundledEdges: GraphEdge[] = [];
  const processedPaths = new Set<string>();

  // Get all saved point nodes plus generator and challenge nodes
  const savedNodes = Object.values(graph.nodes).filter(
    node => isNodeSaved(node, savedPoints) || node.isGenerator || node.isChallenge
  );

  // For each pair of saved/special nodes, find paths and bundle operations
  for (const fromNode of savedNodes) {
    for (const toNode of savedNodes) {
      if (fromNode.id === toNode.id) continue;

      const pathKey = `${fromNode.id}_to_${toNode.id}`;
      const reversePathKey = `${toNode.id}_to_${fromNode.id}`;

      if (processedPaths.has(pathKey) || processedPaths.has(reversePathKey)) {
        continue;
      }

      const operationsPath = findOperationsBetweenNodes(graph, fromNode.id, toNode.id);

      if (operationsPath && operationsPath.length > 1) {
        // Bundle multiple operations into a single edge
        const bundledEdge = createBundledEdge(fromNode.id, toNode.id, operationsPath);
        bundledEdges.push(bundledEdge);
        processedPaths.add(pathKey);
      } else if (operationsPath && operationsPath.length === 1) {
        // Single operation - create normal edge but mark for potential future bundling
        const singleEdge: GraphEdge = {
          id: `bundled_${fromNode.id}_to_${toNode.id}`,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          operation: operationsPath[0],
          isBundled: false,
        };
        bundledEdges.push(singleEdge);
        processedPaths.add(pathKey);
      }
    }
  }

  return bundledEdges;
}

/**
 * Find operations between two nodes using BFS
 */
function findOperationsBetweenNodes(
  graph: PointGraph,
  fromNodeId: string,
  toNodeId: string
): Operation[] | null {
  if (fromNodeId === toNodeId) return [];

  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: Operation[] }> = [{ nodeId: fromNodeId, path: [] }];
  visited.add(fromNodeId);

  while (queue.length > 0) {
    const { nodeId: currentNodeId, path } = queue.shift()!;

    // Find all outgoing edges from current node
    const outgoingEdges = Object.values(graph.edges).filter(
      edge => edge.fromNodeId === currentNodeId
    );

    for (const edge of outgoingEdges) {
      const newPath = [...path, edge.operation];

      if (edge.toNodeId === toNodeId) {
        return newPath;
      }

      if (!visited.has(edge.toNodeId)) {
        visited.add(edge.toNodeId);
        queue.push({ nodeId: edge.toNodeId, path: newPath });
      }
    }
  }

  return null;
}

/**
 * Create a bundled edge from multiple operations with scalar optimization
 */
function createBundledEdge(
  fromNodeId: string,
  toNodeId: string,
  operations: Operation[]
): GraphEdge {
  // First, remove negation pairs
  const optimizedOps = removeNegationPairs(operations);

  // Separate negations from other operations
  const { nonNegationOps, hasNegations } = separateNegationOperations(optimizedOps);

  // If we only have non-negation operations, compute scalar and create single multiply operation
  if (!hasNegations && nonNegationOps.length > 0) {
    const scalar = computeOperationScalar(nonNegationOps);
    const scalarOperation = createScalarOperation(optimizedOps, scalar);

    return {
      id: `scalar_${fromNodeId}_to_${toNodeId}`,
      fromNodeId,
      toNodeId,
      operation: scalarOperation,
      isBundled: true,
      bundledOperations: [scalarOperation], // Store the computed scalar operation
    };
  }

  // If we have negations, we need to preserve the original bundled structure
  // TODO: More sophisticated negation handling could be added here
  const summaryOperation: Operation = {
    id: `bundled_${optimizedOps.map(op => op.id).join('_')}`,
    type: 'multiply',
    description: `${optimizedOps.length} operations: ${optimizedOps.map(op => op.description).join(' → ')}`,
    value: `Bundle of ${optimizedOps.length} operations`,
  };

  return {
    id: `bundled_${fromNodeId}_to_${toNodeId}`,
    fromNodeId,
    toNodeId,
    operation: summaryOperation,
    bundledOperations: optimizedOps,
    isBundled: true,
  };
}

/**
 * Get the effective operations from an edge (handles both bundled and regular)
 */
export function getEffectiveOperations(edge: GraphEdge): Operation[] {
  if (edge.isBundled && edge.bundledOperations) {
    return edge.bundledOperations;
  }
  return [edge.operation];
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
 * Check if two consecutive operations are a negation pair that cancels out
 */
function isNegationPair(op1: Operation, op2: Operation): boolean {
  return op1.type === 'negate' && op2.type === 'negate';
}

/**
 * Remove negation pairs from a sequence of operations
 */
function removeNegationPairs(operations: Operation[]): Operation[] {
  const optimized: Operation[] = [];

  for (let i = 0; i < operations.length; i++) {
    const current = operations[i];
    const next = operations[i + 1];

    // If current and next form a negation pair, skip both
    if (next && isNegationPair(current, next)) {
      i++; // Skip the next operation too
      continue;
    }

    optimized.push(current);
  }

  return optimized;
}

/**
 * Separate operations into negation and non-negation groups
 */
function separateNegationOperations(operations: Operation[]): {
  nonNegationOps: Operation[];
  negationOps: Operation[];
  hasNegations: boolean;
} {
  const nonNegationOps: Operation[] = [];
  const negationOps: Operation[] = [];

  for (const op of operations) {
    if (op.type === 'negate') {
      negationOps.push(op);
    } else {
      nonNegationOps.push(op);
    }
  }

  return {
    nonNegationOps,
    negationOps,
    hasNegations: negationOps.length > 0,
  };
}

/**
 * Create a scalar multiplication operation from bundled operations
 */
function createScalarOperation(operations: Operation[], scalar: bigint): Operation {
  const operationIds = operations.map(op => op.id).join('_');

  return {
    id: `scalar_${operationIds}`,
    type: 'multiply',
    description: `×${scalar.toString()} (${operations.length} ops bundled)`,
    value: scalar.toString(),
  };
}

/**
 * Check if a node should be preserved (saved points, generator, challenge, or negation nodes)
 */
function shouldPreserveNode(
  node: GraphNode,
  savedPoints: SavedPoint[],
  negationNodeIds: Set<string>
): boolean {
  return (
    isNodeSaved(node, savedPoints) ||
    node.isGenerator ||
    node.isChallenge ||
    negationNodeIds.has(node.id)
  );
}

/**
 * Find all nodes that are involved in negation operations
 */
function findNegationNodes(graph: PointGraph): Set<string> {
  const negationNodeIds = new Set<string>();

  for (const edge of Object.values(graph.edges)) {
    if (edge.operation.type === 'negate') {
      negationNodeIds.add(edge.fromNodeId);
      negationNodeIds.add(edge.toNodeId);
    }

    // Also check bundled operations
    if (edge.bundledOperations) {
      const hasNegation = edge.bundledOperations.some(op => op.type === 'negate');
      if (hasNegation) {
        negationNodeIds.add(edge.fromNodeId);
        negationNodeIds.add(edge.toNodeId);
      }
    }
  }

  return negationNodeIds;
}

/**
 * Replace regular edges with bundled edges in the graph and clean up unused nodes/edges
 */
export function optimizeGraphWithBundling(
  graph: PointGraph,
  savedPoints: SavedPoint[]
): PointGraph {
  // Find negation nodes that should be preserved
  const negationNodeIds = findNegationNodes(graph);

  const bundledEdges = createBundledEdges(graph, savedPoints);

  // Create new graph starting fresh
  const optimizedGraph: PointGraph = {
    nodes: {},
    edges: {},
    pointToNodeId: {},
  };

  // Get all saved/special node IDs that should be preserved
  const savedNodeIds = new Set(
    Object.values(graph.nodes)
      .filter(node => shouldPreserveNode(node, savedPoints, negationNodeIds))
      .map(node => node.id)
  );

  // Add preserved nodes to optimized graph
  for (const nodeId of savedNodeIds) {
    const node = graph.nodes[nodeId];
    if (node) {
      optimizedGraph.nodes[nodeId] = node;
      const pointHash = pointToHash(node.point);
      optimizedGraph.pointToNodeId[pointHash] = nodeId;
    }
  }

  // Add bundled edges (these replace multiple individual edges between saved points)
  for (const bundledEdge of bundledEdges) {
    optimizedGraph.edges[bundledEdge.id] = bundledEdge;
  }

  // Add remaining edges that involve preserved nodes but don't connect two saved points
  for (const edge of Object.values(graph.edges)) {
    const fromIsSaved = savedNodeIds.has(edge.fromNodeId);
    const toIsSaved = savedNodeIds.has(edge.toNodeId);
    const fromIsPreserved = savedNodeIds.has(edge.fromNodeId);
    const toIsPreserved = savedNodeIds.has(edge.toNodeId);

    // Keep edges that:
    // 1. Connect preserved nodes but don't connect two saved points (e.g., negation edges)
    // 2. OR connect preserved nodes where at least one is not a saved point
    const shouldKeepEdge =
      (fromIsPreserved && toIsPreserved && (!fromIsSaved || !toIsSaved)) ||
      edge.operation.type === 'negate'; // Always preserve negation edges

    if (shouldKeepEdge) {
      optimizedGraph.edges[edge.id] = edge;
    }
  }

  return optimizedGraph;
}
