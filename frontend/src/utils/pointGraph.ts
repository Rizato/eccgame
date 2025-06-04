import type { ECPoint, GraphNode, GraphEdge, PointGraph, Operation } from '../types/ecc';
import { calculateKeyFromOperations } from './privateKeyCalculation';
import { getEffectiveOperations } from './operationBundling';

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
 * Get all edges connected to a node (both incoming and outgoing)
 */
export function getAllConnectedEdges(
  graph: PointGraph,
  nodeId: string
): Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }> {
  const connections: Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }> = [];

  for (const edge of Object.values(graph.edges)) {
    if (edge.fromNodeId === nodeId) {
      connections.push({ edge, direction: 'outgoing' });
    } else if (edge.toNodeId === nodeId) {
      connections.push({ edge, direction: 'incoming' });
    }
  }

  return connections;
}

/**
 * Check if there's a path between two nodes using BFS (bidirectional)
 */
export function hasPath(graph: PointGraph, fromNodeId: string, toNodeId: string): boolean {
  if (fromNodeId === toNodeId) return true;

  const visited = new Set<string>();
  const queue = [fromNodeId];
  visited.add(fromNodeId);

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;

    // Check all connected edges (both directions)
    const connections = getAllConnectedEdges(graph, currentNodeId);
    for (const { edge, direction } of connections) {
      // Get the connected node (opposite end of the edge)
      const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;

      if (connectedNodeId === toNodeId) {
        return true;
      }

      if (!visited.has(connectedNodeId)) {
        visited.add(connectedNodeId);
        queue.push(connectedNodeId);
      }
    }
  }

  return false;
}

/**
 * Find the shortest path between two nodes and return the operations (bidirectional)
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

    // Check all connected edges (both directions)
    const connections = getAllConnectedEdges(graph, currentNodeId);
    for (const { edge, direction } of connections) {
      const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;

      // Get effective operations (handles bundled edges)
      const effectiveOperations = getEffectiveOperations(edge);

      // Create operations (reverse them if we're traversing backwards)
      const operations =
        direction === 'outgoing'
          ? effectiveOperations
          : effectiveOperations.map(op => reverseOperation(op)).reverse();

      const newPath = [...path, ...operations];

      if (connectedNodeId === toNodeId) {
        return newPath;
      }

      if (!visited.has(connectedNodeId)) {
        visited.add(connectedNodeId);
        queue.push({ nodeId: connectedNodeId, path: newPath });
      }
    }
  }

  return null;
}

/**
 * Reverse an operation for backward traversal
 */
function reverseOperation(operation: Operation): Operation {
  switch (operation.type) {
    case 'multiply':
      return { ...operation, type: 'divide' };
    case 'divide':
      return { ...operation, type: 'multiply' };
    case 'add':
      return { ...operation, type: 'subtract' };
    case 'subtract':
      return { ...operation, type: 'add' };
    case 'negate':
      return { ...operation }; // Negate is its own inverse
    default:
      return operation;
  }
}

/**
 * Calculate private key for a node by traversing to nodes with known private keys (bidirectional)
 */
export function calculateNodePrivateKey(graph: PointGraph, nodeId: string): bigint | undefined {
  const node = graph.nodes[nodeId];
  if (!node) return undefined;
  if (node.privateKey !== undefined) return node.privateKey;

  // Use BFS to find a path to any node with a known private key (bidirectional)
  const visited = new Set<string>();
  const queue: Array<{
    nodeId: string;
    path: Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }>;
  }> = [{ nodeId, path: [] }];
  visited.add(nodeId);

  while (queue.length > 0) {
    const { nodeId: currentNodeId, path } = queue.shift()!;

    // Check all connected edges (both directions)
    const connections = getAllConnectedEdges(graph, currentNodeId);
    for (const connection of connections) {
      const { edge, direction } = connection;
      const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
      const connectedNode = graph.nodes[connectedNodeId];

      if (connectedNode?.privateKey !== undefined) {
        // Found a node with known private key, calculate through the path
        const fullPath = [...path, connection];
        return calculateKeyThroughBidirectionalPath(
          connectedNode.privateKey,
          fullPath,
          connectedNodeId,
          nodeId
        );
      }

      if (!visited.has(connectedNodeId)) {
        visited.add(connectedNodeId);
        queue.push({ nodeId: connectedNodeId, path: [...path, connection] });
      }
    }
  }

  return undefined;
}

/**
 * Calculate private key by applying operations along a bidirectional path
 */
function calculateKeyThroughBidirectionalPath(
  startingKey: bigint,
  path: Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }>,
  startNodeId: string,
  targetNodeId: string
): bigint {
  // Build the sequence of operations to get from startNodeId to targetNodeId
  let currentKey = startingKey;
  let currentNodeId = startNodeId;

  for (const { edge, direction } of path) {
    // Get effective operations and apply them based on direction
    const effectiveOperations = getEffectiveOperations(edge);
    const operations =
      direction === 'outgoing'
        ? effectiveOperations
        : effectiveOperations.map(op => reverseOperation(op)).reverse();

    // Apply the operations
    currentKey = calculateKeyFromOperations(operations, currentKey);

    // Update current node for next iteration
    currentNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
  }

  return currentKey;
}

/**
 * Calculate private key by applying operations along a path (legacy function for compatibility)
 */
function calculateKeyThroughPath(startingKey: bigint, edgePath: GraphEdge[]): bigint {
  const operations = edgePath.map(edge => edge.operation);
  return calculateKeyFromOperations(operations, startingKey);
}
