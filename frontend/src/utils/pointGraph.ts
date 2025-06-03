import type { ECPoint, GraphNode, GraphEdge, PointGraph, Operation } from '../types/ecc';
import { calculateKeyFromOperations } from './privateKeyCalculation';

/**
 * Create a hash key for a point for lookup purposes
 */
export function pointToHash(point: ECPoint): string {
  if (point.isInfinity) {
    return 'INFINITY';
  }
  return `${point.x.toString(16)}_${point.y.toString(16)}`;
}

/**
 * Create an empty graph
 */
export function createEmptyGraph(): PointGraph {
  return {
    nodes: {},
    edges: {},
    pointToNodeId: {},
  };
}

/**
 * Add a node to the graph
 */
export function addNode(
  graph: PointGraph,
  point: ECPoint,
  options: {
    id?: string;
    label?: string;
    privateKey?: bigint;
    isGenerator?: boolean;
    isChallenge?: boolean;
  } = {}
): GraphNode {
  const pointHash = pointToHash(point);
  const existingNodeId = graph.pointToNodeId[pointHash];

  if (existingNodeId) {
    const existingNode = graph.nodes[existingNodeId]!;
    // Update existing node with new information
    if (options.privateKey !== undefined) {
      existingNode.privateKey = options.privateKey;
    }
    if (options.label) {
      existingNode.label = options.label;
    }
    if (options.isGenerator !== undefined) {
      existingNode.isGenerator = options.isGenerator;
    }
    if (options.isChallenge !== undefined) {
      existingNode.isChallenge = options.isChallenge;
    }
    return existingNode;
  }

  const nodeId = options.id || `node_${Object.keys(graph.nodes).length}`;
  const node: GraphNode = {
    id: nodeId,
    point,
    label: options.label || `Point ${nodeId}`,
    privateKey: options.privateKey,
    isGenerator: options.isGenerator,
    isChallenge: options.isChallenge,
  };

  graph.nodes[nodeId] = node;
  graph.pointToNodeId[pointHash] = nodeId;

  return node;
}

/**
 * Add an edge to the graph
 */
export function addEdge(
  graph: PointGraph,
  fromNodeId: string,
  toNodeId: string,
  operation: Operation
): GraphEdge {
  const edgeId = `${fromNodeId}_to_${toNodeId}_${operation.id}`;
  const edge: GraphEdge = {
    id: edgeId,
    fromNodeId,
    toNodeId,
    operation,
  };

  graph.edges[edgeId] = edge;
  return edge;
}

/**
 * Find a node by its point
 */
export function findNodeByPoint(graph: PointGraph, point: ECPoint): GraphNode | undefined {
  const pointHash = pointToHash(point);
  const nodeId = graph.pointToNodeId[pointHash];
  return nodeId ? graph.nodes[nodeId] : undefined;
}

/**
 * Get all edges from a node
 */
export function getOutgoingEdges(graph: PointGraph, nodeId: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const edge of Object.values(graph.edges)) {
    if (edge.fromNodeId === nodeId) {
      edges.push(edge);
    }
  }
  return edges;
}

/**
 * Get all edges to a node
 */
export function getIncomingEdges(graph: PointGraph, nodeId: string): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const edge of Object.values(graph.edges)) {
    if (edge.toNodeId === nodeId) {
      edges.push(edge);
    }
  }
  return edges;
}

/**
 * Check if there's a path between two nodes using BFS
 */
export function hasPath(graph: PointGraph, fromNodeId: string, toNodeId: string): boolean {
  if (fromNodeId === toNodeId) return true;

  const visited = new Set<string>();
  const queue = [fromNodeId];
  visited.add(fromNodeId);

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    const outgoingEdges = getOutgoingEdges(graph, currentNodeId);
    for (const edge of outgoingEdges) {
      if (edge.toNodeId === toNodeId) {
        return true;
      }

      if (!visited.has(edge.toNodeId)) {
        visited.add(edge.toNodeId);
        queue.push(edge.toNodeId);
      }
    }
  }

  return false;
}

/**
 * Find the shortest path between two nodes and return the operations
 */
export function findPath(
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

    const outgoingEdges = getOutgoingEdges(graph, currentNodeId);
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
 * Calculate private key for a node by traversing back to nodes with known private keys
 */
export function calculateNodePrivateKey(graph: PointGraph, nodeId: string): bigint | undefined {
  const node = graph.nodes[nodeId];
  if (!node) return undefined;
  if (node.privateKey !== undefined) return node.privateKey;

  // Use BFS to find a path to any node with a known private key
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: GraphEdge[] }> = [{ nodeId, path: [] }];
  visited.add(nodeId);

  while (queue.length > 0) {
    const { nodeId: currentNodeId, path } = queue.shift()!;

    // Check incoming edges (paths that lead TO this node)
    const incomingEdges = getIncomingEdges(graph, currentNodeId);
    for (const edge of incomingEdges) {
      const sourceNode = graph.nodes[edge.fromNodeId];
      if (sourceNode?.privateKey !== undefined) {
        // Found a node with known private key, calculate through the path
        const reversePath = [edge, ...path].reverse();
        return calculateKeyThroughPath(sourceNode.privateKey, reversePath);
      }

      if (!visited.has(edge.fromNodeId)) {
        visited.add(edge.fromNodeId);
        queue.push({ nodeId: edge.fromNodeId, path: [edge, ...path] });
      }
    }
  }

  return undefined;
}

/**
 * Calculate private key by applying operations along a path
 */
function calculateKeyThroughPath(startingKey: bigint, edgePath: GraphEdge[]): bigint {
  const operations = edgePath.map(edge => edge.operation);
  return calculateKeyFromOperations(operations, startingKey);
}
