export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract' | 'negate' | 'nop';
  description: string;
  value: string;
  point?: ECPoint;
}

export interface KnownPoint {
  id: string;
  point: ECPoint;
  startingPoint?: KnownPoint;
  operations: Operation[];
  label: string;
  privateKey?: bigint; // Stored private key when known
}

export interface SavedPoint extends KnownPoint {
  timestamp: number;
}

export interface ECPoint {
  x: bigint;
  y: bigint;
  isInfinity?: boolean;
}
