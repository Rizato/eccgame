import {
  createEmptyGraph,
  addNode,
  ensureOperationInGraph,
  clearNodeCounter,
} from './graphOperations';
import type { PointGraph, ECPoint, GraphNode, Operation, GraphEdge } from '../types/ecc';

/**
 * High-performance graph cache that operates outside Redux state
 * Uses Maps for O(1) lookups and avoids Redux serialization overhead
 */
class GraphCache {
  private graphs = new Map<string, PointGraph>();
  private nodeMap = new Map<string, Map<string, GraphNode>>();
  private pointMap = new Map<string, Map<string, string>>();
  private edgeMap = new Map<string, Map<string, GraphEdge[]>>();

  /**
   * Get or create a graph for the given mode
   */
  getGraph(mode: string): PointGraph {
    if (!this.graphs.has(mode)) {
      this.graphs.set(mode, createEmptyGraph());
      this.nodeMap.set(mode, new Map());
      this.pointMap.set(mode, new Map());
      this.edgeMap.set(mode, new Map());
    }
    return this.graphs.get(mode)!;
  }

  /**
   * Fast node lookup using Map
   */
  findNodeByPoint(mode: string, point: ECPoint): GraphNode | undefined {
    const pointMap = this.pointMap.get(mode);
    const nodeMap = this.nodeMap.get(mode);

    if (!pointMap || !nodeMap) return undefined;

    const pointHash = this.pointToHash(point);
    const nodeId = pointMap.get(pointHash);
    return nodeId ? nodeMap.get(nodeId) : undefined;
  }

  /**
   * Add a node with Map optimization
   */
  addNode(mode: string, point: ECPoint, options: Record<string, unknown> = {}): GraphNode {
    const graph = this.getGraph(mode);
    const nodeMap = this.nodeMap.get(mode)!;
    const pointMap = this.pointMap.get(mode)!;

    // Pass mode to prevent cross-contamination between practice/daily
    const node = addNode(graph, point, { ...options, mode });

    // Update Maps for performance
    nodeMap.set(node.id, node);
    pointMap.set(this.pointToHash(point), node.id);

    return node;
  }

  /**
   * Add operation with optimization
   */
  addOperation(mode: string, fromPoint: ECPoint, toPoint: ECPoint, operation: Operation): void {
    const graph = this.getGraph(mode);
    ensureOperationInGraph(graph, fromPoint, toPoint, operation, mode);

    // Update Maps after operation
    this.syncMaps(mode, graph);
  }

  /**
   * Get graph statistics efficiently
   */
  getStats(mode: string): { nodes: number; edges: number } {
    const nodeMap = this.nodeMap.get(mode);
    const edgeMap = this.edgeMap.get(mode);

    if (nodeMap && edgeMap) {
      const nodes = nodeMap.size;
      const edges = Array.from(edgeMap.values()).reduce((sum, edges) => sum + edges.length, 0);
      return { nodes, edges };
    }

    // Fallback to object counting
    const graph = this.getGraph(mode);
    return {
      nodes: Object.keys(graph.nodes).length,
      edges: Object.values(graph.edges).reduce((sum, edges) => sum + edges.length, 0),
    };
  }

  /**
   * Clear graph for mode
   */
  clearGraph(mode: string): void {
    this.graphs.set(mode, createEmptyGraph());
    this.nodeMap.set(mode, new Map());
    this.pointMap.set(mode, new Map());
    this.edgeMap.set(mode, new Map());
    // Clear node counter to ensure complete isolation
    clearNodeCounter(mode);
  }

  /**
   * Export graph state for Redux (minimal data)
   */
  exportForRedux(mode: string): { nodeCount: number; edgeCount: number; hasNodes: boolean } {
    const stats = this.getStats(mode);
    return {
      nodeCount: stats.nodes,
      edgeCount: stats.edges,
      hasNodes: stats.nodes > 0,
    };
  }

  private pointToHash(point: ECPoint): string {
    if (point.isInfinity) return 'INFINITY';
    return `${point.x.toString(16)}_${point.y.toString(16)}`;
  }

  private syncMaps(mode: string, graph: PointGraph): void {
    const nodeMap = this.nodeMap.get(mode)!;
    const pointMap = this.pointMap.get(mode)!;
    const edgeMap = this.edgeMap.get(mode)!;

    // Sync nodes
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
      nodeMap.set(nodeId, node);
    }

    // Sync point mappings
    for (const [pointHash, nodeId] of Object.entries(graph.pointToNodeId)) {
      pointMap.set(pointHash, nodeId);
    }

    // Sync edges
    for (const [nodeId, edges] of Object.entries(graph.edges)) {
      edgeMap.set(nodeId, edges);
    }
  }
}

// Global cache instance
export const graphCache = new GraphCache();

// Helper functions for components
export function getCachedGraph(mode: string): PointGraph {
  return graphCache.getGraph(mode);
}

export function addCachedNode(mode: string, point: ECPoint, options: Record<string, unknown> = {}): GraphNode {
  return graphCache.addNode(mode, point, options);
}

export function findCachedNodeByPoint(mode: string, point: ECPoint): GraphNode | undefined {
  return graphCache.findNodeByPoint(mode, point);
}

export function addCachedOperation(
  mode: string,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation
): void {
  graphCache.addOperation(mode, fromPoint, toPoint, operation);
}

export function getCachedGraphStats(mode: string): { nodes: number; edges: number } {
  return graphCache.getStats(mode);
}

export function clearCachedGraph(mode: string): void {
  graphCache.clearGraph(mode);
}

export function exportCachedGraphForRedux(mode: string) {
  return graphCache.exportForRedux(mode);
}
