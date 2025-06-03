export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract' | 'negate' | 'nop';
  description: string;
  value: string;
  point?: ECPoint;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  operation: Operation;
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
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  pointToNodeId: Map<string, string>; // point hash -> node id for quick lookup
}

export interface KnownPoint {
  id: string;
  point: ECPoint;
  label: string;
}

export interface SavedPoint extends KnownPoint {
  timestamp: number;
}

export interface ECPoint {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}
