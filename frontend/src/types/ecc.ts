export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract' | 'negate';
  description: string;
  value: string;
  point?: ECPoint;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  operation: Operation;
  isBundled?: boolean;
  bundleCount?: bigint;
}

export interface GraphNode {
  id: string;
  point: ECPoint;
  privateKey?: bigint;
  label: string;
  isGenerator?: boolean;
  isChallenge?: boolean;
}

export interface PointGraph {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  pointToNodeId: Record<string, string>; // point hash -> node id for quick lookup
}

export interface SavedPoint {
  id: string;
  point: ECPoint;
  label: string;
  timestamp: number;
  privateKey?: bigint;
}

export interface ECPoint {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}
