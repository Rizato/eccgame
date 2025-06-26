import {
  OperationType,
  type ECPoint,
  type GraphNode,
  type GraphEdge,
  type PointGraph,
  type Operation,
  type EdgeListNode,
} from '../types/ecc';
import { pointMultiply, getGeneratorPoint, publicKeyToPoint, pointNegate } from './ecc';
import { calculateKeyFromOperations } from './privateKeyCalculation';
import type { Challenge } from '../types/game';

/**
 * Helper function to find an edge in a linked list
 */
export function findEdgeInList(head: EdgeListNode | null, edgeId: string): GraphEdge | undefined {
  let current = head;
  while (current !== null) {
    if (current.val.id === edgeId) {
      return current.val;
    }
    current = current.next;
  }
  return undefined;
}

/**
 * Helper function to add an edge to a linked list (prepends for O(1) insertion)
 */
function addEdgeToList(head: EdgeListNode | null, edge: GraphEdge): EdgeListNode {
  const newNode: EdgeListNode = {
    val: edge,
    next: head,
  };
  return newNode;
}

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
 * Create x-coordinate key for bucket lookup
 */
export function pointToXKey(point: ECPoint): string {
  if (point.isInfinity) {
    return 'INFINITY';
  }
  return point.x.toString(16);
}

// Mode-specific counters to ensure unique node IDs and prevent cross-mode contamination
const nodeCounters = new Map<string, number>();

function getNextNodeId(mode?: string): string {
  if (mode) {
    // Mode-specific counter to prevent cross-contamination between practice/daily
    const currentCount = nodeCounters.get(mode) || 0;
    const nextCount = currentCount + 1;
    nodeCounters.set(mode, nextCount);
    return `${mode}_node_${nextCount}`;
  } else {
    // Fallback for when mode is not provided (shouldn't happen in normal usage)
    const globalCount = nodeCounters.get('global') || 0;
    const nextCount = globalCount + 1;
    nodeCounters.set('global', nextCount);
    return `node_${nextCount}`;
  }
}

/**
 * Clear node counter for a specific mode to ensure complete isolation
 */
export function clearNodeCounter(mode: string): void {
  nodeCounters.delete(mode);
}

/**
 * Create an empty graph with x-coordinate tracking
 */
export function createEmptyGraph(): PointGraph {
  return {
    nodes: {},
    edges: {},
    pointToNodeId: {},
    xCoordinates: new Set(),
  };
}

/**
 * Add a node to the graph with x-coordinate bucket optimization
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
    connectedToG?: boolean;
    mode?: string; // Add mode to prevent cross-contamination
  } = {}
): GraphNode {
  const pointHash = pointToHash(point);
  const existingNodeId = graph.pointToNodeId[pointHash];

  if (existingNodeId) {
    const existingNode = graph.nodes[existingNodeId]!;
    // Track if we need to propagate changes
    const needsPrivateKeyPropagation =
      (options.privateKey !== undefined && existingNode.privateKey === undefined) ||
      (options.connectedToG === true && existingNode.connectedToG !== true);

    // Update existing node with new information
    if (options.privateKey !== undefined) {
      existingNode.privateKey = options.privateKey;
    }
    if (options.label) {
      existingNode.label = options.label;
    }
    if (options.isGenerator !== undefined) {
      existingNode.isGenerator = options.isGenerator;
      // Update connectedToG if this is now a generator
      if (options.isGenerator) {
        existingNode.connectedToG = true;
      }
    }
    if (options.isChallenge !== undefined) {
      existingNode.isChallenge = options.isChallenge;
    }

    if (options.connectedToG !== undefined) {
      existingNode.connectedToG = existingNode.connectedToG || options.connectedToG;
    }

    // If we just set a private key, propagate it to connected nodes
    if (needsPrivateKeyPropagation) {
      unifiedPropagation(graph, [existingNodeId]);
    }

    return existingNode;
  }

  const nodeId = options.id || getNextNodeId(options.mode);
  const node: GraphNode = {
    id: nodeId,
    point,
    label: options.label || `Point ${nodeId}`,
    privateKey: options.privateKey,
    isGenerator: options.isGenerator,
    isChallenge: options.isChallenge,
    // Generator nodes are always connected to G by definition
    connectedToG: options.isGenerator || options.connectedToG,
  };

  graph.nodes[nodeId] = node;
  if (!graph.edges[nodeId]) {
    graph.edges[nodeId] = null;
  }
  graph.pointToNodeId[pointHash] = nodeId;

  // Check if the negation of this node already exists and create edge if so
  // This enables automatic detection of negation relationships (like reaching -G)
  checkAndCreateNegationEdge(graph, node);

  // Add x-coordinate to tracking set for future negation detection
  addXCoordinate(graph, node.point);

  return node;
}

/**
 * Add an edge to the graph (creates both forward and reverse edges)
 */
export function addEdge(
  graph: PointGraph,
  fromNodeId: string,
  toNodeId: string,
  operation: Operation
): GraphEdge {
  const edgeId = `${fromNodeId}_to_${toNodeId}_by_operation_${operation.type}_${operation.value}`;

  // Initialize edge lists if they don't exist
  if (!graph.edges[fromNodeId]) {
    graph.edges[fromNodeId] = null;
  }
  if (!graph.edges[toNodeId]) {
    graph.edges[toNodeId] = null;
  }

  // Check if forward edge already exists
  let forwardEdge = findEdgeInList(graph.edges[fromNodeId], edgeId);
  if (forwardEdge) {
    // Update userCreated flag to be sticky
    forwardEdge.operation.userCreated = forwardEdge.operation.userCreated || operation.userCreated;
    return forwardEdge;
  }

  // Create forward edge
  forwardEdge = {
    id: edgeId,
    fromNodeId,
    toNodeId,
    operation,
  };
  graph.edges[fromNodeId] = addEdgeToList(graph.edges[fromNodeId], forwardEdge);

  // Create reverse edge with inverted operation
  const reversedOp = reverseOperation(operation);
  const reverseEdgeId = `${toNodeId}_to_${fromNodeId}_by_operation_${reversedOp.type}_${reversedOp.value}`;
  const reverseEdge: GraphEdge = {
    id: reverseEdgeId,
    fromNodeId: toNodeId,
    toNodeId: fromNodeId,
    operation: reversedOp,
  };

  // Only add reverse edge if it doesn't already exist
  if (!findEdgeInList(graph.edges[toNodeId], reverseEdgeId)) {
    graph.edges[toNodeId] = addEdgeToList(graph.edges[toNodeId], reverseEdge);
  }

  return forwardEdge;
}

/**
 * Add x-coordinate to tracking set
 */
function addXCoordinate(graph: PointGraph, point: ECPoint): void {
  const xKey = pointToXKey(point);
  graph.xCoordinates.add(xKey);
}

/**
 * Check if the negated version of this point already exists in the graph
 */
export function findNegatedPoint(graph: PointGraph, point: ECPoint): GraphNode | undefined {
  if (point.isInfinity) {
    return undefined;
  }

  // Calculate what the negated point would be
  const negatedPoint = pointNegate(point);
  const negatedHash = pointToHash(negatedPoint);

  // Check if the negated point exists in the graph
  const negatedNodeId = graph.pointToNodeId[negatedHash];
  if (negatedNodeId) {
    return graph.nodes[negatedNodeId];
  }

  return undefined;
}

/**
 * Check if negation exists and create edge if it does
 * This allows automatic detection of negation relationships
 */
function checkAndCreateNegationEdge(graph: PointGraph, node: GraphNode): void {
  // Only check if this x-coordinate already exists
  if (!hasXCoordinate(graph, node.point)) {
    return;
  }

  const negatedNode = findNegatedPoint(graph, node.point);

  if (negatedNode) {
    // Found the negated point! Create negation edges between them
    const negateOp: Operation = {
      type: OperationType.NEGATE,
      description: '±',
      value: '',
      userCreated: false, // Auto-detected, not user created
    };

    // Add bidirectional negation edges
    addEdge(graph, node.id, negatedNode.id, negateOp);

    // Trigger propagation between the negated pair
    propagateIfNeeded(graph, node, negatedNode, negateOp);
  }
}

/**
 * Find a node by its point, with bucket optimization for negated points
 */
export function findNodeByPoint(graph: PointGraph, point: ECPoint): GraphNode | undefined {
  const pointHash = pointToHash(point);
  const nodeId = graph.pointToNodeId[pointHash];
  return nodeId ? graph.nodes[nodeId] : undefined;
}

/**
 * Check if this x-coordinate already exists in the graph
 */
export function hasXCoordinate(graph: PointGraph, point: ECPoint): boolean {
  if (point.isInfinity) {
    return false;
  }

  const xKey = pointToXKey(point);
  return graph.xCoordinates.has(xKey);
}

/**
 * Get all edges connected to a node (both incoming and outgoing)
 */
export function getAllConnectedEdges(
  graph: PointGraph,
  nodeId: string
): Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }> {
  const connections: Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }> = [];

  // Iterate through linked list of edges from this node
  let current = graph.edges[nodeId];
  while (current !== null) {
    const edge = current.val;
    // Since we store bidirectional edges, all edges from this node are "outgoing"
    // The direction is determined by whether this node is the fromNode
    if (edge.fromNodeId === nodeId) {
      connections.push({ edge, direction: 'outgoing' });
    } else {
      connections.push({ edge, direction: 'incoming' });
    }
    current = current.next;
  }

  return connections;
}

/**
 * Reverse an operation for backward traversal
 */
export function reverseOperation(operation: Operation): Operation {
  switch (operation.type) {
    case OperationType.MULTIPLY:
      return { ...operation, type: OperationType.DIVIDE };
    case OperationType.DIVIDE:
      return { ...operation, type: OperationType.MULTIPLY };
    case OperationType.ADD:
      return { ...operation, type: OperationType.SUBTRACT };
    case OperationType.SUBTRACT:
      return { ...operation, type: OperationType.ADD };
    case OperationType.NEGATE:
      return { ...operation }; // Negate is its own inverse
    default:
      return operation;
  }
}

/**
 * Calculate the private key for any point using graph connectivity
 */
export function calculatePrivateKeyFromGraph(
  point: ECPoint,
  graph: PointGraph
): bigint | undefined {
  const node = findNodeByPoint(graph, point);

  if (!node) {
    // Special case: if this is the generator point and not in graph, assume private key 1
    const generator = getGeneratorPoint();
    if (!point.isInfinity && point.x === generator.x && point.y === generator.y) {
      return 1n;
    }
    return undefined;
  }

  // If we already have the private key stored, return it
  if (node.privateKey !== undefined) {
    return node.privateKey;
  }

  // Special case: if this is a generator node but doesn't have private key set, it should be 1
  if (node.isGenerator) {
    return 1n;
  }

  return undefined;
}

/**
 * Calculate the challenge point's private key using graph traversal
 */
export function calculateChallengePrivateKeyFromGraph(
  challenge: Challenge,
  graph: PointGraph
): bigint | undefined {
  const challengePoint = publicKeyToPoint(challenge.public_key);
  const challengeNode = findNodeByPoint(graph, challengePoint);

  if (!challengeNode) {
    return undefined;
  }

  return challengeNode.privateKey;
}

/**
 * Verify that a private key generates the correct public key for a given point
 */
function verifyPrivateKeyForPoint(privateKey: bigint, point: ECPoint): boolean {
  try {
    if (point.isInfinity) {
      // Point at infinity should have private key 0 (but this is edge case)
      return privateKey === 0n;
    }

    const generatedPoint = pointMultiply(privateKey, getGeneratorPoint());
    return generatedPoint.x === point.x && generatedPoint.y === point.y;
  } catch {
    return false;
  }
}

/**
 * Ensure an operation (and its result) are added to the graph
 * This should be called for EVERY operation, regardless of source
 */
export function ensureOperationInGraph(
  graph: PointGraph,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation,
  mode?: string // Add mode to prevent cross-contamination
): void {
  // Add the from node if it doesn't exist
  let fromNode = findNodeByPoint(graph, fromPoint);
  if (!fromNode) {
    fromNode = addNode(graph, fromPoint, {
      label: 'Point',
      mode,
    });
  }

  // Add the to node if it doesn't exist
  let toNode = findNodeByPoint(graph, toPoint);
  if (!toNode) {
    toNode = addNode(graph, toPoint, {
      label: `Point from ${operation.description}`,
      mode,
    });
  }

  // Add the edge between them
  addEdge(graph, fromNode.id, toNode.id, operation);
  propagateIfNeeded(graph, fromNode, toNode, operation);
}

function propagateIfNeeded(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode,
  operation: Operation
): void {
  // Determine initial state
  const fromConnected = fromNode.connectedToG || false;
  const toConnected = toNode.connectedToG || false;

  const queue: string[] = [];
  // Update connectedState
  toNode.connectedToG = toNode.connectedToG || fromNode.connectedToG;
  fromNode.connectedToG = toNode.connectedToG || fromNode.connectedToG;

  // Queue up if the connected state changed
  let queueFrom = fromNode.connectedToG && !fromConnected;
  let queueTo = toNode.connectedToG && !toConnected;

  // Queue up if the key can be propagated
  if (fromNode.privateKey !== undefined && toNode.privateKey === undefined) {
    toNode.privateKey = calculateKeyFromOperations([operation], fromNode.privateKey!);
    queueTo = true;
  } else if (toNode.privateKey !== undefined && fromNode.privateKey === undefined) {
    const reverseOp = reverseOperation(operation);
    fromNode.privateKey = calculateKeyFromOperations([reverseOp], toNode.privateKey!);
    queueFrom = true;
  }

  if (queueFrom) {
    queue.push(fromNode.id);
  }
  if (queueTo) {
    queue.push(toNode.id);
  }

  // Single unified propagation pass
  if (operation.userCreated && queue.length > 0) {
    unifiedPropagation(graph, queue);
  }
}

/**
 * Unified propagation that handles both connectedToG and private keys in a single BFS pass
 * This is much more efficient than separate propagation functions
 */
function unifiedPropagation(graph: PointGraph, initialQueue: string[]): void {
  // Set up initial propagation state
  const queue: string[] = [];
  const visited = new Set<string>();

  for (const nodeId of initialQueue) {
    queue.push(nodeId);
  }

  // Single BFS pass to propagate both properties
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const currentNode = graph.nodes[currentNodeId];
    if (!currentNode) continue;

    // Iterate through linked list of edges from this node
    let current = graph.edges[currentNodeId];
    while (current !== null) {
      const edge = current.val;
      const connectedNodeId = edge.toNodeId;
      const connectedNode = graph.nodes[connectedNodeId];
      if (!connectedNode || visited.has(connectedNodeId)) {
        current = current.next;
        continue;
      }
      let needsQueueing = false;
      // Propagate connectedToG
      if (currentNode.connectedToG && !connectedNode.connectedToG) {
        connectedNode.connectedToG = true;
        needsQueueing = true;
      }

      try {
        // If we have a key and they do not
        if (currentNode.privateKey !== undefined && connectedNode.privateKey === undefined) {
          const calculatedKey = calculateKeyFromOperations(
            [edge.operation],
            currentNode.privateKey
          );
          if (verifyPrivateKeyForPoint(calculatedKey, connectedNode.point)) {
            connectedNode.privateKey = calculatedKey;
            needsQueueing = true;
          }
        }
      } catch (error) {
        console.warn(`Failed to calculate private key for node ${connectedNodeId}:`, error);
      }

      if (needsQueueing) {
        queue.push(connectedNodeId);
      }
      current = current.next;
    }
  }
}
