import type { PointGraph } from '../types/ecc';
import type { Challenge } from '../types/api';
import { publicKeyToPoint } from './ecc';
import { findNodeByPoint, hasPath, findPath, calculateNodePrivateKey } from './pointGraph';

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
