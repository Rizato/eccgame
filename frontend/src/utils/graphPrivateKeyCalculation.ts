import type { PointGraph, GraphNode, GraphEdge } from '../types/ecc';
import type { Challenge } from '../types/api';
import { publicKeyToPoint, pointToPublicKey } from './ecc';
import { findNodeByPoint, hasPath, findPath, calculateNodePrivateKey } from './pointGraph';
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
  const generatorNode = Array.from(graph.nodes.values()).find(node => node.isGenerator);
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
  const generatorNode = Array.from(graph.nodes.values()).find(node => node.isGenerator);
  if (!generatorNode) {
    return [];
  }

  const operations = findPath(graph, challengeNode.id, generatorNode.id);
  return operations ? operations.map(op => op.description) : [];
}

/**
 * Update all node private keys in the graph based on known connections
 */
export function updateAllPrivateKeys(graph: PointGraph): void {
  // Find all nodes with known private keys
  const knownNodes = Array.from(graph.nodes.values()).filter(node => node.privateKey !== undefined);

  if (knownNodes.length === 0) {
    return;
  }

  // Use BFS to propagate private keys through the graph
  const visited = new Set<string>();
  const queue: GraphNode[] = [...knownNodes];

  for (const node of knownNodes) {
    visited.add(node.id);
  }

  while (queue.length > 0) {
    const currentNode = queue.shift()!;

    // Find all edges connected to this node
    const outgoingEdges = Array.from(graph.edges.values()).filter(
      edge => edge.fromNodeId === currentNode.id
    );
    const incomingEdges = Array.from(graph.edges.values()).filter(
      edge => edge.toNodeId === currentNode.id
    );

    // Calculate private keys for nodes reachable via outgoing edges
    for (const edge of outgoingEdges) {
      const targetNode = graph.nodes.get(edge.toNodeId);
      if (targetNode && targetNode.privateKey === undefined && !visited.has(targetNode.id)) {
        const calculatedKey = calculateKeyFromOperations([edge.operation], currentNode.privateKey!);
        targetNode.privateKey = calculatedKey;
        visited.add(targetNode.id);
        queue.push(targetNode);
      }
    }

    // Calculate private keys for nodes that reach this node via incoming edges
    for (const edge of incomingEdges) {
      const sourceNode = graph.nodes.get(edge.fromNodeId);
      if (sourceNode && sourceNode.privateKey === undefined && !visited.has(sourceNode.id)) {
        // We need to reverse the operation to go backwards
        const reversedOperation = reverseOperation(edge.operation);
        const calculatedKey = calculateKeyFromOperations(
          [reversedOperation],
          currentNode.privateKey!
        );
        sourceNode.privateKey = calculatedKey;
        visited.add(sourceNode.id);
        queue.push(sourceNode);
      }
    }
  }
}

/**
 * Reverse an operation for backward calculation
 */
function reverseOperation(operation: any): any {
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
