import { calculateKeyFromOperations, type Operation } from './privateKeyCalculation';
import type { ECPoint } from './ecc';

/**
 * Calculate the actual private key for a given point based on operations and starting private key
 * If startingPrivateKey is provided, we can calculate the current private key
 * If not provided, we return undefined (unknown private key)
 */
export function calculatePrivateKeyByPointId(
  pointId: string,
  operations: Operation[],
  currentPoint: ECPoint,
  startingPrivateKey: bigint | undefined, // The private key of the starting point (if known)
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | undefined {
  try {
    if (pointId === 'generator') {
      return 1n;
    } else if (pointId === 'original' && isPracticeMode && practicePrivateKey) {
      return BigInt('0x' + practicePrivateKey);
    } else if (pointId === 'current') {
      // Only calculate if we know the starting private key
      if (startingPrivateKey !== undefined) {
        try {
          return calculateKeyFromOperations(operations, startingPrivateKey);
        } catch {
          return undefined;
        }
      } else {
        // Don't know the starting private key, so can't calculate current private key
        return undefined;
      }
    } else if (pointId === 'previous' && operations.length > 1) {
      // Calculate private key for the previous point (without the last operation)
      if (startingPrivateKey !== undefined) {
        const opsWithoutLast = operations.slice(0, -1);
        try {
          return calculateKeyFromOperations(opsWithoutLast, startingPrivateKey);
        } catch {
          return undefined;
        }
      } else {
        // Don't know the starting private key, so can't calculate previous private key
        return undefined;
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}
