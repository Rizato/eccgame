import { calculateKeyFromOperations } from './privateKeyCalculation';
import { pointMultiply, getGeneratorPoint, publicKeyToPoint } from './ecc';
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
  // Fast exit when one has a private key and the other does not, as adding them to the graph should have propagated this
  // We cannot rely on this completely, as in practice mode all nodes have private keys already
  const fromHasPrivateKey = graph.nodes[fromNodeId].privateKey !== undefined;
  const toHasPrivateKey = graph.nodes[toNodeId].privateKey !== undefined;
  if ((fromHasPrivateKey || toHasPrivateKey) && !(fromHasPrivateKey && toHasPrivateKey))
    return false;

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
      const operation =
        direction === 'outgoing' ? edge.operation : reverseOperation(edge.operation);

      const newPath = [...path, operation];

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
        return calculateKeyThroughBidirectionalPath(connectedNode.privateKey, fullPath);
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
  path: Array<{ edge: GraphEdge; direction: 'outgoing' | 'incoming' }>
): bigint {
  // Build the sequence of operations to get from startNodeId to targetNodeId
  let currentKey = startingKey;

  for (const { edge, direction } of path) {
    // Apply operation based on direction
    const operation = direction === 'incoming' ? edge.operation : reverseOperation(edge.operation);

    // Apply the operations
    currentKey = calculateKeyFromOperations([operation], currentKey);
  }

  return currentKey;
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
  if (node.privateKey !== undefined) {
    return node.privateKey;
  }

  // Use graph traversal to calculate the private key
  return calculateNodePrivateKey(graph, node.id);
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

  // If we already have the private key stored, return it
  if (challengeNode.privateKey !== undefined) {
    return challengeNode.privateKey;
  }

  // Use graph traversal to calculate the private key
  return calculateNodePrivateKey(graph, challengeNode.id);
}

/**
 * Check if the challenge can be solved (has a path to generator)
 */
export function canSolveChallenge(challenge: Challenge, graph: PointGraph): boolean {
  const challengePoint = publicKeyToPoint(challenge.public_key);
  const challengeNode = findNodeByPoint(graph, challengePoint);

  if (!challengeNode) {
    return false;
  }

  // Find generator node
  const generatorNode = Object.values(graph.nodes).find(node => node.isGenerator);
  if (!generatorNode) {
    return false;
  }

  return hasPath(graph, challengeNode.id, generatorNode.id);
}

/**
 * Get the operations needed to solve the challenge
 */
export function getSolutionPath(challenge: Challenge, graph: PointGraph): string[] {
  const challengePoint = publicKeyToPoint(challenge.public_key);
  const challengeNode = findNodeByPoint(graph, challengePoint);

  if (!challengeNode) {
    return [];
  }

  // Find generator node
  const generatorNode = Object.values(graph.nodes).find(node => node.isGenerator);
  if (!generatorNode) {
    return [];
  }

  const operations = findPath(graph, challengeNode.id, generatorNode.id);
  return operations ? operations.map(op => op.description) : [];
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

  // Propagate private keys if one node has a key and the other doesn't
  propagatePrivateKeyFromNodes(graph, fromNode, toNode, operation);

  // Propagate connectedToG property through the graph
  propagateConnectedToG(graph);
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

// Propagate connectedToG property through the graph
export function propagateConnectedToG(graph: PointGraph): void {
  // Find all nodes with connectedToG = true and propagate from them
  const startNodes = Object.entries(graph.nodes)
    .filter(([_, node]) => node.connectedToG === true)
    .map(([nodeId, _]) => nodeId);

  for (const nodeId of startNodes) {
    propagateConnectedToGRecursively(graph, nodeId, new Set<string>());
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
