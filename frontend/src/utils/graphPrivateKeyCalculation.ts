import type { PointGraph, GraphNode } from '../types/ecc';
import type { Challenge } from '../types/api';
import { publicKeyToPoint } from './ecc';
import {
  findNodeByPoint,
  hasPath,
  findPath,
  calculateNodePrivateKey,
  reverseOperation,
} from './pointGraph';
import { calculateKeyFromOperations } from './privateKeyCalculation';

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
 * Update all node private keys in the graph based on known connections
 * This function is now more defensive against race conditions and incomplete graph states
 */
export function updateAllPrivateKeys(graph: PointGraph): void {
  // Find all nodes with known private keys
  const knownNodes = Object.values(graph.nodes).filter(node => node.privateKey !== undefined);

  if (knownNodes.length === 0) {
    return;
  }

  // Create a snapshot of the current graph state to avoid race conditions
  const edgeSnapshot = Object.values(graph.edges);
  const nodeIds = new Set(Object.keys(graph.nodes));

  // Use BFS to propagate private keys through the graph
  const visited = new Set<string>();
  const queue: GraphNode[] = [...knownNodes];
  const updates = new Map<string, bigint>(); // Batch updates

  for (const node of knownNodes) {
    visited.add(node.id);
  }

  while (queue.length > 0) {
    const currentNode = queue.shift()!;

    // Verify node still exists (defensive programming)
    if (!nodeIds.has(currentNode.id) || !graph.nodes[currentNode.id]) {
      continue;
    }

    // Find all edges connected to this node from our snapshot
    const outgoingEdges = edgeSnapshot.filter(
      edge => edge.fromNodeId === currentNode.id && nodeIds.has(edge.toNodeId)
    );
    const incomingEdges = edgeSnapshot.filter(
      edge => edge.toNodeId === currentNode.id && nodeIds.has(edge.fromNodeId)
    );

    // Calculate private keys for nodes reachable via outgoing edges
    for (const edge of outgoingEdges) {
      const targetNode = graph.nodes[edge.toNodeId];
      if (targetNode && targetNode.privateKey === undefined && !visited.has(targetNode.id)) {
        try {
          const calculatedKey = calculateKeyFromOperations(
            [edge.operation],
            currentNode.privateKey!
          );
          updates.set(targetNode.id, calculatedKey);
          visited.add(targetNode.id);
          queue.push(targetNode);
        } catch (error) {
          // Skip this calculation if it fails
          console.warn('Failed to calculate private key for outgoing edge:', error);
        }
      }
    }

    // Calculate private keys for nodes that reach this node via incoming edges
    for (const edge of incomingEdges) {
      const sourceNode = graph.nodes[edge.fromNodeId];
      if (sourceNode && sourceNode.privateKey === undefined && !visited.has(sourceNode.id)) {
        try {
          // We need to reverse the operations to go backwards
          const calculatedKey = calculateKeyFromOperations(
            [reverseOperation(edge.operation)],
            currentNode.privateKey!
          );
          updates.set(sourceNode.id, calculatedKey);
          visited.add(sourceNode.id);
          queue.push(sourceNode);
        } catch (error) {
          // Skip this calculation if it fails
          console.warn('Failed to calculate private key for incoming edge:', error);
        }
      }
    }
  }

  // Apply all updates atomically at the end
  for (const [nodeId, privateKey] of updates) {
    const node = graph.nodes[nodeId];
    if (node && node.privateKey === undefined) {
      node.privateKey = privateKey;
    }
  }
}
