import { pointMultiply, getGeneratorPoint, publicKeyToPoint } from './ecc';
import { calculateKeyFromOperations } from './privateKeyCalculation';
import type { ECPoint, GraphNode, GraphEdge, PointGraph, Operation } from '../types/ecc';
import type { Challenge } from '../types/game';

/**
 * Create a hash key for a point for lookup purposes
 */
export function pointToHash(point: ECPoint): string {
  if (point.isInfinity) {
    return 'INFINITY';
  }
  return `${point.x.toString(16)}_${point.y.toString(16)}`;
}

// Global counter to ensure unique node IDs even after cleanup
let globalNodeCounter = 0;

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
    // Track if we need to propagate changes
    const needsPrivateKeyPropagation =
      options.privateKey !== undefined && existingNode.privateKey === undefined;

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

    // If we just set a private key, propagate it to connected nodes
    // But only if this node is now connectedToG (meaning it's likely user-created or generator)
    if (needsPrivateKeyPropagation && existingNode.connectedToG) {
      propagatePrivateKeyRecursively(graph, existingNodeId, new Set());
    }

    return existingNode;
  }

  const nodeId = options.id || `node_${globalNodeCounter++}`;
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
  const edgeId = `${fromNodeId}_to_${toNodeId}_by_operation_${operation.type}_${operation.value}`;
  // Check if edge already exists - if so, update userCreated flag and return existing edge
  if (graph.edges[edgeId]) {
    const existing = graph.edges[edgeId];
    // Use |= to make userCreated sticky (once true, stays true)
    existing.operation.userCreated = existing.operation.userCreated || operation.userCreated;
    return existing;
  }

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
 * Reverse an operation for backward traversal
 */
export function reverseOperation(operation: Operation): Operation {
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
 * Calculate the private key for any point using graph connectivity
 */
export function calculatePrivateKeyFromGraph(
  point: ECPoint,
  graph: PointGraph
): bigint | undefined {
  const node = findNodeByPoint(graph, point);

  if (!node) {
    return undefined;
  }

  // If we already have the private key stored, return it
  return node.privateKey;
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

  // Single unified propagation pass
  unifiedPropagation(graph, fromNode, toNode, operation);
}

/**
 * Unified propagation that handles both connectedToG and private keys in a single BFS pass
 * This is much more efficient than separate propagation functions
 */
function unifiedPropagation(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode,
  operation: Operation
): void {
  // Determine initial state
  const fromConnected = fromNode.connectedToG || false;
  const toConnected = toNode.connectedToG || false;
  const shouldPropagateKeys = operation.userCreated && fromConnected !== toConnected;

  // Early exit if neither node needs propagation
  if (!fromConnected && !toConnected && !fromNode.privateKey && !toNode.privateKey) {
    return;
  }

  // Set up initial propagation state
  const queue: string[] = [];
  const visited = new Set<string>();

  // Handle the immediate connection between fromNode and toNode
  if (fromConnected && !toConnected) {
    toNode.connectedToG = true;
    if (
      shouldPropagateKeys &&
      fromNode.privateKey !== undefined &&
      toNode.privateKey === undefined
    ) {
      toNode.privateKey = calculateKeyFromOperations([operation], fromNode.privateKey);
    }
    queue.push(toNode.id);
  } else if (toConnected && !fromConnected) {
    fromNode.connectedToG = true;
    if (
      shouldPropagateKeys &&
      toNode.privateKey !== undefined &&
      fromNode.privateKey === undefined
    ) {
      const reverseOp = reverseOperation(operation);
      fromNode.privateKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
    }
    queue.push(fromNode.id);
  }

  // If both nodes are now connected or one was already connected, propagate from connected nodes
  if (fromNode.connectedToG) queue.push(fromNode.id);
  if (toNode.connectedToG) queue.push(toNode.id);

  // Single BFS pass to propagate both properties
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const currentNode = graph.nodes[currentNodeId];
    if (!currentNode) continue;

    // Get all connected nodes
    const connections = getAllConnectedEdges(graph, currentNodeId);

    for (const { edge, direction } of connections) {
      const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
      const connectedNode = graph.nodes[connectedNodeId];

      if (!connectedNode || visited.has(connectedNodeId)) continue;

      let needsQueueing = false;

      // Propagate connectedToG (always)
      if (currentNode.connectedToG && !connectedNode.connectedToG) {
        connectedNode.connectedToG = true;
        needsQueueing = true;
      }

      // Propagate private key (only for user operations when crossing connectedToG boundary)
      if (
        edge.operation.userCreated &&
        currentNode.privateKey !== undefined &&
        connectedNode.privateKey === undefined &&
        currentNode.connectedToG
      ) {
        try {
          let calculatedKey: bigint;

          if (direction === 'outgoing') {
            calculatedKey = calculateKeyFromOperations([edge.operation], currentNode.privateKey);
          } else {
            const reverseOp = reverseOperation(edge.operation);
            calculatedKey = calculateKeyFromOperations([reverseOp], currentNode.privateKey);
          }

          if (verifyPrivateKeyForPoint(calculatedKey, connectedNode.point)) {
            connectedNode.privateKey = calculatedKey;
            needsQueueing = true;
          }
        } catch (error) {
          console.warn(`Failed to calculate private key for node ${connectedNodeId}:`, error);
        }
      }

      if (needsQueueing) {
        queue.push(connectedNodeId);
      }
    }
  }
}

/**
 * Propagate private key between two nodes if one has a key and the other doesn't
 */
export function propagatePrivateKeyFromNodes(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode,
  operation: Operation
): void {
  // Exit if they both have no keys
  if (fromNode.privateKey === undefined && toNode.privateKey === undefined) {
    return;
  }

  // If both nodes have keys, verify they are correct and consistent
  if (fromNode.privateKey !== undefined && toNode.privateKey !== undefined) {
    // First verify that both private keys are correct for their points
    const fromKeyValid = verifyPrivateKeyForPoint(fromNode.privateKey, fromNode.point);
    const toKeyValid = verifyPrivateKeyForPoint(toNode.privateKey, toNode.point);

    if (!fromKeyValid) {
      console.warn('fromNode has invalid private key for its point');
    }

    if (!toKeyValid) {
      console.warn('toNode has invalid private key for its point');
    }

    // If both keys are valid, check consistency with the operation
    if (fromKeyValid && toKeyValid) {
      try {
        const expectedToKey = calculateKeyFromOperations([operation], fromNode.privateKey);
        if (toNode.privateKey !== expectedToKey) {
          console.warn(
            'Valid private keys but inconsistent with operation. This may be due to bundled operations.'
          );
          // Don't overwrite if both keys are individually valid
        }
      } catch (error) {
        console.warn('Failed to verify operation consistency:', error);
      }
    } else if (fromKeyValid && !toKeyValid) {
      // fromNode is correct, toNode is wrong - fix toNode
      try {
        const correctedToKey = calculateKeyFromOperations([operation], fromNode.privateKey);
        if (verifyPrivateKeyForPoint(correctedToKey, toNode.point)) {
          console.warn('Correcting invalid toNode private key based on valid fromNode');
          toNode.privateKey = correctedToKey;
          propagatePrivateKeyRecursively(graph, toNode.id, new Set([fromNode.id]));
        }
      } catch (error) {
        console.warn('Failed to correct toNode private key:', error);
      }
    } else if (!fromKeyValid && toKeyValid) {
      // toNode is correct, fromNode is wrong - fix fromNode
      try {
        const reverseOp = reverseOperation(operation);
        const correctedFromKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
        if (verifyPrivateKeyForPoint(correctedFromKey, fromNode.point)) {
          console.warn('Correcting invalid fromNode private key based on valid toNode');
          fromNode.privateKey = correctedFromKey;
          propagatePrivateKeyRecursively(graph, fromNode.id, new Set([toNode.id]));
        }
      } catch (error) {
        console.warn('Failed to correct fromNode private key:', error);
      }
    }
    return;
  }

  // If fromNode has a private key and toNode doesn't, calculate toNode's key
  if (fromNode.privateKey !== undefined && toNode.privateKey === undefined) {
    try {
      const calculatedKey = calculateKeyFromOperations([operation], fromNode.privateKey);
      // Verify the calculated key is correct before setting it
      if (verifyPrivateKeyForPoint(calculatedKey, toNode.point)) {
        toNode.privateKey = calculatedKey;
        // Recursively propagate from toNode, but add fromNode to visited already
        propagatePrivateKeyRecursively(graph, toNode.id, new Set([fromNode.id]));
      } else {
        console.warn('Calculated private key does not match toNode point - not setting');
      }
    } catch (error) {
      console.warn('Failed to calculate private key from fromNode to toNode:', error);
    }
  }
  // If toNode has a private key and fromNode doesn't, calculate fromNode's key
  else if (toNode.privateKey !== undefined && fromNode.privateKey === undefined) {
    try {
      const reverseOp = reverseOperation(operation);
      const calculatedKey = calculateKeyFromOperations([reverseOp], toNode.privateKey);
      // Verify the calculated key is correct before setting it
      if (verifyPrivateKeyForPoint(calculatedKey, fromNode.point)) {
        fromNode.privateKey = calculatedKey;
        // Recursively propagate from fromNode, but add toNode to visited already
        propagatePrivateKeyRecursively(graph, fromNode.id, new Set([toNode.id]));
      } else {
        console.warn('Calculated private key does not match fromNode point - not setting');
      }
    } catch (error) {
      console.warn('Failed to calculate private key from toNode to fromNode:', error);
    }
  }
}

/**
 * Recursively propagate private keys from a node to all its connected nodes
 */
function propagatePrivateKeyRecursively(
  graph: PointGraph,
  nodeId: string,
  visited: Set<string>
): void {
  const node = graph.nodes[nodeId];
  if (!node || node.privateKey === undefined || visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);
  const connections = getAllConnectedEdges(graph, nodeId);

  for (const { edge, direction } of connections) {
    const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
    const connectedNode = graph.nodes[connectedNodeId];

    // Skip if already visited or if the connected node already has a private key
    if (visited.has(connectedNodeId) || !connectedNode || connectedNode.privateKey !== undefined) {
      continue;
    }

    try {
      let calculatedKey: bigint;

      if (direction === 'outgoing') {
        // Going from current node to connected node
        calculatedKey = calculateKeyFromOperations([edge.operation], node.privateKey);
      } else {
        // Going from connected node to current node (reverse direction)
        const reverseOp = reverseOperation(edge.operation);
        calculatedKey = calculateKeyFromOperations([reverseOp], node.privateKey);
      }

      connectedNode.privateKey = calculatedKey;
      // Continue propagating from the newly calculated node
      propagatePrivateKeyRecursively(graph, connectedNodeId, visited);
    } catch (error) {
      console.warn(`Failed to calculate private key for node ${connectedNodeId}:`, error);
    }
  }
}

/**
 * Propagate connectedToG property between two nodes if one is connected and the other isn't
 */
export function propagateConnectedToGFromNodes(
  graph: PointGraph,
  fromNode: GraphNode,
  toNode: GraphNode
): void {
  // Exit if neither node is connected to G
  if (!fromNode.connectedToG && !toNode.connectedToG) {
    return;
  }

  // Exit if both nodes are already connected to G
  if (fromNode.connectedToG && toNode.connectedToG) {
    return;
  }

  // If fromNode is connected to G and toNode isn't, propagate to toNode
  if (fromNode.connectedToG && !toNode.connectedToG) {
    toNode.connectedToG = true;
    // Recursively propagate from toNode, but add fromNode to visited already
    propagateConnectedToGRecursively(graph, toNode.id, new Set([fromNode.id]));
  }
  // If toNode is connected to G and fromNode isn't, propagate to fromNode
  else if (toNode.connectedToG && !fromNode.connectedToG) {
    fromNode.connectedToG = true;
    // Recursively propagate from fromNode, but add toNode to visited already
    propagateConnectedToGRecursively(graph, fromNode.id, new Set([toNode.id]));
  }
}

// Helper function to get all connected node IDs
function getConnectedNodeIds(graph: PointGraph, nodeId: string): string[] {
  const connectedIds = new Set<string>();
  const connections = getAllConnectedEdges(graph, nodeId);

  for (const { edge, direction } of connections) {
    const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
    connectedIds.add(connectedNodeId);
  }

  return Array.from(connectedIds);
}

// Recursively propagate connectedToG from a starting node
function propagateConnectedToGRecursively(
  graph: PointGraph,
  nodeId: string,
  visited: Set<string>
): void {
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);

  const node = graph.nodes[nodeId];
  if (!node || !node.connectedToG) {
    return;
  }

  // Find all connected nodes
  const connectedNodeIds = getConnectedNodeIds(graph, nodeId);

  for (const connectedNodeId of connectedNodeIds) {
    const connectedNode = graph.nodes[connectedNodeId];
    if (!connectedNode || connectedNode.connectedToG) {
      continue; // Skip if already connected to G
    }

    // Mark as connected to G
    connectedNode.connectedToG = true;

    // Continue propagating from the newly connected node
    propagateConnectedToGRecursively(graph, connectedNodeId, visited);
  }
}

/**
 * Manually trigger propagation from a node - useful when properties are set after node creation
 * Uses unified BFS propagation for efficiency
 */
export function triggerPropagationFromNode(graph: PointGraph, nodeId: string): void {
  const node = graph.nodes[nodeId];
  if (!node) {
    return;
  }

  // Use unified BFS propagation starting from this node
  const queue: string[] = [nodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const currentNode = graph.nodes[currentNodeId];
    if (!currentNode) continue;

    const connections = getAllConnectedEdges(graph, currentNodeId);

    for (const { edge, direction } of connections) {
      const connectedNodeId = direction === 'outgoing' ? edge.toNodeId : edge.fromNodeId;
      const connectedNode = graph.nodes[connectedNodeId];

      if (!connectedNode || visited.has(connectedNodeId)) continue;

      let needsQueueing = false;

      // Propagate connectedToG
      if (currentNode.connectedToG && !connectedNode.connectedToG) {
        connectedNode.connectedToG = true;
        needsQueueing = true;
      }

      // Propagate private key (only for user operations)
      if (
        edge.operation.userCreated &&
        currentNode.privateKey !== undefined &&
        connectedNode.privateKey === undefined &&
        currentNode.connectedToG
      ) {
        try {
          let calculatedKey: bigint;

          if (direction === 'outgoing') {
            calculatedKey = calculateKeyFromOperations([edge.operation], currentNode.privateKey);
          } else {
            const reverseOp = reverseOperation(edge.operation);
            calculatedKey = calculateKeyFromOperations([reverseOp], currentNode.privateKey);
          }

          if (verifyPrivateKeyForPoint(calculatedKey, connectedNode.point)) {
            connectedNode.privateKey = calculatedKey;
            needsQueueing = true;
          }
        } catch (error) {
          console.warn(`Failed to calculate private key for node ${connectedNodeId}:`, error);
        }
      }

      if (needsQueueing) {
        queue.push(connectedNodeId);
      }
    }
  }
}
