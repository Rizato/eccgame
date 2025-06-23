export enum OperationType {
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  ADD = 'add',
  SUBTRACT = 'subtract',
  NEGATE = 'negate',
}

export interface Operation {
  type: OperationType;
  description: string;
  value: string;
  userCreated?: boolean;
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
  connectedToG?: boolean;
}

export interface PointGraph {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge[]>; // nodeId -> array of edges FROM this node
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

/**
 * Intermediate point information for tracking double-and-add steps
 */
export interface IntermediatePoint {
  point: ECPoint;
  operation: Operation;
  privateKey?: bigint;
}

/**
 * Single operation to add to the graph
 */
export interface SingleOperationPayload {
  fromPoint: ECPoint;
  toPoint: ECPoint;
  operation: Operation;
  toPointPrivateKey?: bigint; // Pre-calculated private key for toPoint
}
