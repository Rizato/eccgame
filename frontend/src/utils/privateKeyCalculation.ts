import { CURVE_N, hexToBigint, modInverse } from './ecc';
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
  startingMode: 'generator' | 'challenge';
  operations: Operation[];
  label: string;
  timestamp: number;
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
 * Calculate private key from saved point and additional operations
 */
export function calculatePrivateKeyFromSavedPoint(
  savedPoint: SavedPoint,
  additionalOperations: Operation[],
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  try {
    // First calculate the private key for the saved point
    const savedPointPrivateKey = calculatePrivateKey(
      savedPoint.operations,
      savedPoint.startingMode,
      isPracticeMode,
      practicePrivateKey
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
  startingMode: 'generator' | 'challenge',
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  try {
    // Case 1: We can always calculate if starting mode is generator
    if (startingMode === 'generator') {
      // G -> current: start from 1
      return calculateKeyFromOperations(operations, 1n);
    } else if (isPracticeMode && practicePrivateKey) {
      // Case 2: challenge->G with practice mode, we can always calculate from known challenge private key
      const challengePrivateKey = BigInt('0x' + practicePrivateKey);
      return calculateKeyFromOperations(operations, challengePrivateKey);
    }
    // Case 3: For challenge->G without practice mode, we can't know the starting private key
    return null;
  } catch {
    return null;
  }
}
