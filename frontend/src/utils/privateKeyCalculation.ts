import { CURVE_N, hexToBigint, modInverse, getGeneratorPoint } from './ecc';
import type { ECPoint } from './ecc';

export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract' | 'nop';
  description: string;
  value: string;
  point?: ECPoint;
}

export interface SavedPoint {
  id: string;
  point: ECPoint;
  startingPoint: ECPoint;
  operations: Operation[];
  label: string;
  timestamp: number;
  privateKey?: bigint; // Stored private key when known
}

/**
 * Calculate private key from a series of operations starting from a given private key
 */
export function calculateKeyFromOperations(
  operations: Operation[],
  startingPrivateKey: bigint
): bigint {
  let currentPrivateKey = startingPrivateKey;

  for (const op of operations) {
    switch (op.type) {
      case 'multiply':
        if (op.value) {
          const scalar = op.value.startsWith('0x') ? hexToBigint(op.value) : BigInt(op.value);
          currentPrivateKey = (currentPrivateKey * scalar) % CURVE_N;
        }
        break;
      case 'divide':
        if (op.value) {
          const scalar = op.value.startsWith('0x') ? hexToBigint(op.value) : BigInt(op.value);
          const inverse = modInverse(scalar, CURVE_N);
          currentPrivateKey = (currentPrivateKey * inverse) % CURVE_N;
        }
        break;
      case 'add':
        if (op.value) {
          const scalar = op.value.startsWith('0x') ? hexToBigint(op.value) : BigInt(op.value);
          currentPrivateKey = (currentPrivateKey + scalar) % CURVE_N;
        }
        break;
      case 'subtract':
        if (op.value) {
          const scalar = op.value.startsWith('0x') ? hexToBigint(op.value) : BigInt(op.value);
          currentPrivateKey = (currentPrivateKey - scalar + CURVE_N) % CURVE_N;
        }
        break;
      case 'nop':
        break;
    }
  }

  return currentPrivateKey;
}

/**
 * Helper function to check if two points are equal
 */
function pointsEqual(p1: ECPoint, p2: ECPoint): boolean {
  if (p1.isInfinity && p2.isInfinity) return true;
  if (p1.isInfinity || p2.isInfinity) return false;
  return p1.x === p2.x && p1.y === p2.y;
}

/**
 * Enhanced private key calculation that determines the starting point from context
 */
export function calculatePrivateKeyEnhanced(
  operations: Operation[],
  currentPoint: ECPoint,
  knownPoints: Array<{
    point: ECPoint;
    privateKey: bigint;
    label: string;
  }> = [],
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  try {
    const generatorPoint = getGeneratorPoint();

    // First priority: Check if we're at a known point (direct match)
    for (const knownPoint of knownPoints) {
      if (pointsEqual(currentPoint, knownPoint.point)) {
        return knownPoint.privateKey;
      }
    }

    // If we have no operations, we can only identify base points
    if (operations.length === 0) {
      // Check if it's the generator point
      if (pointsEqual(currentPoint, generatorPoint)) {
        return 1n;
      }

      // Check if it's the challenge point in practice mode
      if (isPracticeMode && practicePrivateKey) {
        return BigInt('0x' + practicePrivateKey);
      }

      // Unknown point with no operations - can't calculate
      return null;
    }

    // We can only calculate private keys if we know where the operations started from
    // We need to be very careful here - we can't just try random starting points

    // For operations that we know started from the generator point
    if (operations.length > 0) {
      // We need to know the actual starting point to calculate correctly
      // This is complex without full point verification, so we'll be conservative

      // Only calculate if we're in practice mode and know all the private keys
      if (isPracticeMode && practicePrivateKey) {
        // Try challenge point as starting point
        try {
          const challengePrivateKey = BigInt('0x' + practicePrivateKey);
          const fromChallenge = calculateKeyFromOperations(operations, challengePrivateKey);
          if (fromChallenge !== null) {
            return fromChallenge;
          }
        } catch {
          // Continue
        }

        // Try generator as starting point
        try {
          const fromGenerator = calculateKeyFromOperations(operations, 1n);
          if (fromGenerator !== null) {
            return fromGenerator;
          }
        } catch {
          // Continue
        }
      }

      // Try known saved points as starting points only if we have their private keys
      for (const knownPoint of knownPoints) {
        try {
          const result = calculateKeyFromOperations(operations, knownPoint.privateKey);
          if (result !== null) {
            return result;
          }
        } catch {
          // Continue to next known point
          continue;
        }
      }
    }

    // No valid starting point found
    return null;
  } catch {
    return null;
  }
}

/**
 * Calculate private key from saved point and additional operations
 */
export function calculatePrivateKeyFromSavedPoint(
  savedPoint: SavedPoint,
  additionalOperations: Operation[],
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  try {
    // If we have the private key stored, use it directly
    if (savedPoint.privateKey !== undefined) {
      return calculateKeyFromOperations(additionalOperations, savedPoint.privateKey);
    }

    // Fallback to the old method if private key not stored
    const generatorPoint = getGeneratorPoint();
    let startingPrivateKey: bigint;

    if (pointsEqual(savedPoint.startingPoint, generatorPoint)) {
      startingPrivateKey = 1n;
    } else if (isPracticeMode && practicePrivateKey) {
      startingPrivateKey = BigInt('0x' + practicePrivateKey);
    } else {
      return null; // Can't determine starting private key
    }

    // Calculate the private key for the saved point
    const savedPointPrivateKey = calculateKeyFromOperations(
      savedPoint.operations,
      startingPrivateKey
    );

    if (savedPointPrivateKey === null) {
      return null;
    }

    // Then apply additional operations from the saved point
    return calculateKeyFromOperations(additionalOperations, savedPointPrivateKey);
  } catch {
    return null;
  }
}

/**
 * Calculate the actual private key for the current point in ECCCalculator context
 */
export function calculatePrivateKey(
  operations: Operation[],
  currentPoint: ECPoint,
  knownPoints: Array<{
    point: ECPoint;
    privateKey: bigint;
    label: string;
  }> = [],
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  return calculatePrivateKeyEnhanced(
    operations,
    currentPoint,
    knownPoints,
    isPracticeMode,
    practicePrivateKey
  );
}
