import {
  createEmptyGraph,
  addNode,
  ensureOperationInGraph,
  clearNodeCounter,
  findNodeByPoint,
} from './graphOperations';
import type { PointGraph, ECPoint, GraphNode, Operation } from '../types/ecc';

/**
 * High-performance graph cache that operates outside Redux state
 * Avoids Redux serialization overhead by keeping graphs in memory
 */
class GraphCache {
  private graphs = new Map<string, PointGraph>();

  /**
   * Get or create a graph for the given mode
   */
  getGraph(mode: string): PointGraph {
    if (!this.graphs.has(mode)) {
      this.graphs.set(mode, createEmptyGraph());
    }
    return this.graphs.get(mode)!;
  }

  /**
   * Clear graph for mode
   */
  clearGraph(mode: string): void {
    this.graphs.set(mode, createEmptyGraph());
    // Clear node counter to ensure complete isolation
    clearNodeCounter(mode);
  }
}

// Global cache instance
export const graphCache = new GraphCache();

// Helper functions for components
export function getCachedGraph(mode: string): PointGraph {
  return graphCache.getGraph(mode);
}

export function addCachedNode(
  mode: string,
  point: ECPoint,
  options: Record<string, unknown> = {}
): GraphNode {
  const graph = graphCache.getGraph(mode);
  return addNode(graph, point, { ...options, mode });
}

export function findCachedNodeByPoint(mode: string, point: ECPoint): GraphNode | undefined {
  const graph = graphCache.getGraph(mode);
  return findNodeByPoint(graph, point);
}

export function addCachedOperation(
  mode: string,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation
): void {
  const graph = graphCache.getGraph(mode);
  ensureOperationInGraph(graph, fromPoint, toPoint, operation, mode);
}

export function clearCachedGraph(mode: string): void {
  graphCache.clearGraph(mode);
}
