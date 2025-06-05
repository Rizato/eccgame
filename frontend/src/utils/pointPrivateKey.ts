import { findNodeByPoint, calculateNodePrivateKey } from './pointGraph';
import type { ECPoint, PointGraph } from '../types/ecc';

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
