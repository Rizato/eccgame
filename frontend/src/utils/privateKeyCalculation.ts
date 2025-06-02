import { CURVE_N, hexToBigint, modInverse, getGeneratorPoint } from './ecc';
import type { ECPoint } from './ecc';

export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract';
  description: string;
  value: string;
  point?: ECPoint;
  direction: 'forward' | 'reverse'; // forward: challenge->G, reverse: G->challenge
}

/**
 * Calculate private key from a series of operations starting from a given private key
 */
export function calculatePrivateKeyFromOperations(
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
          currentPrivateKey = (currentPrivateKey - scalar) % CURVE_N;
        }
        break;
    }
  }

  return currentPrivateKey;
}

/**
 * Calculate the actual private key for a given point based on operations and context
 */
export function calculatePrivateKeyForPoint(
  point: ECPoint,
  pointId: string,
  operations: Operation[],
  startingMode: 'generator' | 'challenge',
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): string | undefined {
  try {
    const generatorPoint = getGeneratorPoint();

    // Case 1: Point is G (generator)
    if (point.x === generatorPoint.x && point.y === generatorPoint.y && !point.isInfinity) {
      return '0000000000000000000000000000000000000000000000000000000000000001';
    }

    // Case 2: Practice mode - we can always calculate from known challenge private key
    if (isPracticeMode && practicePrivateKey) {
      const challengePrivateKey = BigInt('0x' + practicePrivateKey);

      if (pointId === 'current' && operations.length > 0) {
        let currentPrivateKey = startingMode === 'generator' ? 1n : challengePrivateKey;
        currentPrivateKey = calculatePrivateKeyFromOperations(operations, currentPrivateKey);
        return currentPrivateKey.toString(16).padStart(64, '0');
      } else if (pointId === 'original') {
        // Original challenge point
        return practicePrivateKey;
      }
    }

    // Case 3: Current point with operations
    if (pointId === 'current' && operations.length > 0) {
      if (startingMode === 'generator') {
        // G -> current: start from 1
        let currentPrivateKey = 1n;
        currentPrivateKey = calculatePrivateKeyFromOperations(operations, currentPrivateKey);
        return currentPrivateKey.toString(16).padStart(64, '0');
      } else {
        // Challenge -> G: start from 1 and apply operations in reverse
        // TODO This should only be used for the final private key calculation at the end, once we have found victory
        // Also it needs to account for matching the generator point and infinity
        let currentPrivateKey = 1n;
        currentPrivateKey = calculatePrivateKeyFromOperations(
          operations.slice().reverse(),
          currentPrivateKey
        );
        return currentPrivateKey.toString(16).padStart(64, '0');
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Calculate the actual private key for the current point in ECCCalculator context
 */
export function calculateCurrentPrivateKey(
  currentPoint: ECPoint,
  operations: Operation[],
  startingMode: 'generator' | 'challenge',
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | null {
  try {
    const generatorPoint = getGeneratorPoint();

    // Case 1: Current point is G (generator)
    if (
      currentPoint.x === generatorPoint.x &&
      currentPoint.y === generatorPoint.y &&
      !currentPoint.isInfinity
    ) {
      return 1n;
    }

    // Case 2: Practice mode - we can always calculate from known challenge private key
    if (isPracticeMode && practicePrivateKey) {
      const challengePrivateKey = BigInt('0x' + practicePrivateKey);
      let startingPrivateKey = startingMode === 'generator' ? 1n : challengePrivateKey;
      return calculatePrivateKeyFromOperations(operations, startingPrivateKey);
    }

    // Case 3: Not practice mode, but we can still calculate if starting mode is generator
    if (startingMode === 'generator') {
      // For challenge->G without practice mode, we can't know the starting private key
      // G -> current: start from 1
      return calculatePrivateKeyFromOperations(operations, 1n);
    }

    return null;
  } catch {
    return null;
  }
}
