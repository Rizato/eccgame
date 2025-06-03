import { CURVE_N, hexToBigint, modInverse } from './ecc';
import type { Operation } from '../types/ecc.ts';

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
      case 'negate':
        // Negate operation: CURVE_N - privateKey
        currentPrivateKey = (CURVE_N - currentPrivateKey) % CURVE_N;
        break;
    }
  }

  return currentPrivateKey;
}
