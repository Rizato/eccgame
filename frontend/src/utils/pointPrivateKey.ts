import type { ECPoint, PointGraph } from '../types/ecc';
import { findNodeByPoint, hasPath, calculateNodePrivateKey } from './pointGraph';

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
 * Check if a point's private key can be calculated (has connectivity to generator)
 */
export function canCalculatePrivateKey(point: ECPoint, graph: PointGraph): boolean {
  const node = findNodeByPoint(graph, point);

  if (!node) {
    return false;
  }

  // Find generator node
  const generatorNode = Object.values(graph.nodes).find(node => node.isGenerator);
  if (!generatorNode) {
    return false;
  }

  // Check if there's a path from this point to the generator
  return hasPath(graph, node.id, generatorNode.id);
}

/**
 * Get private key for a KnownPoint or SavedPoint using the graph
 */
export function getPrivateKeyForKnownPoint(
  knownPoint: { point: ECPoint },
  graph: PointGraph
): bigint | undefined {
  return calculatePrivateKeyFromGraph(knownPoint.point, graph);
}
