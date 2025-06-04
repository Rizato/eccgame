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
import { propagatePrivateKeyFromNodes } from './ensureOperationInGraph.ts';

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
  const scalar = computeOperationScalar(operations);
  const scalarOperation = createScalarOperation(operations, scalar);

  return {
    id: `scalar_${fromNodeId}_to_${toNodeId}`,
    fromNodeId,
    toNodeId,
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
 * Create a scalar multiplication operation from bundled operations
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
 * Check if a node should be preserved (saved points, generator, or challenge nodes)
 */
function shouldPreserveNode(node: GraphNode, savedPoints: SavedPoint[]): boolean {
  return isNodeSaved(node, savedPoints) || node.isGenerator == true || node.isChallenge == true;
}

/**
 * Replace regular edges with bundled edges in the graph and clean up unused nodes/edges
 */
export function optimizeGraphWithBundling(
  graph: PointGraph,
  savedPoints: SavedPoint[]
): PointGraph {
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
      .filter(node => shouldPreserveNode(node, savedPoints))
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
    const fromNode = optimizedGraph.nodes[bundledEdge.fromNodeId];
    const toNode = optimizedGraph.nodes[bundledEdge.fromNodeId];
    // Propagate keys
    propagatePrivateKeyFromNodes(optimizedGraph, fromNode, toNode, bundledEdge.operation);
  }

  return optimizedGraph;
}
