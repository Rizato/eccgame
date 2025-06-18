/**
 * ECC POINT MANIPULATION UTILITIES
 *
 * Extended cryptographic utilities for elliptic curve operations
 * using elliptic.js for robust and performant curve arithmetic.
 */
import { ec as EC } from 'elliptic';
import * as secp256k1 from 'secp256k1';
import { bytesToHex, hexToBytes } from './crypto';
import type { ECPoint } from '../types/ecc.ts';

// Initialize elliptic curve
const ec = new EC('secp256k1');

// secp256k1 curve parameters
export const CURVE_P = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
export const CURVE_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

/**
 * Convert elliptic.js point to our ECPoint format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ellipticToPoint(ecPoint: any): ECPoint {
  if (ecPoint.isInfinity()) {
    return { x: 0n, y: 0n, isInfinity: true };
  }

  return {
    x: BigInt('0x' + ecPoint.getX().toString(16)),
    y: BigInt('0x' + ecPoint.getY().toString(16)),
    isInfinity: false,
  };
}

/**
 * Convert our ECPoint format to elliptic.js point
 */
function pointToElliptic(point: ECPoint) {
  if (point.isInfinity) {
    return ec.curve.point(null, null);
  }

  return ec.curve.point(point.x.toString(16), point.y.toString(16));
}

/**
 * Get the generator point G
 */
export function getGeneratorPoint(): ECPoint {
  return ellipticToPoint(ec.g);
}

/**
 * Convert public key hex to ECPoint
 */
export function publicKeyToPoint(publicKeyHex: string): ECPoint {
  try {
    const bytes = hexToBytes(publicKeyHex);

    if (bytes.length === 33) {
      // Compressed format - decompress using secp256k1
      const uncompressed = secp256k1.publicKeyConvert(bytes, false);
      const x = BigInt('0x' + bytesToHex(uncompressed.slice(1, 33)));
      const y = BigInt('0x' + bytesToHex(uncompressed.slice(33, 65)));
      return { x, y, isInfinity: false };
    } else if (bytes.length === 65 && bytes[0] === 0x04) {
      // Uncompressed format
      const x = BigInt('0x' + bytesToHex(bytes.slice(1, 33)));
      const y = BigInt('0x' + bytesToHex(bytes.slice(33, 65)));
      return { x, y, isInfinity: false };
    } else {
      throw new Error('Invalid public key format');
    }
  } catch (error) {
    throw new Error(`Failed to parse public key: ${error}`);
  }
}

/**
 * Convert ECPoint to compressed public key hex
 */
export function pointToPublicKey(point: ECPoint): string {
  if (point.isInfinity) {
    throw new Error('Cannot convert point at infinity to public key');
  }

  const ecPoint = pointToElliptic(point);
  return ecPoint.encodeCompressed('hex');
}

/**
 * Point addition on secp256k1 curve using elliptic.js
 */
export function pointAdd(p1: ECPoint, p2: ECPoint): ECPoint {
  const ecP1 = pointToElliptic(p1);
  const ecP2 = pointToElliptic(p2);
  const result = ecP1.add(ecP2);
  return ellipticToPoint(result);
}

/**
 * Point subtraction (p1 - p2) using elliptic.js
 */
export function pointSubtract(p1: ECPoint, p2: ECPoint): ECPoint {
  const ecP1 = pointToElliptic(p1);
  const ecP2 = pointToElliptic(p2);
  const result = ecP1.add(ecP2.neg());
  return ellipticToPoint(result);
}

/**
 * Scalar multiplication using elliptic.js
 */
export function pointMultiply(scalar: bigint, point: ECPoint): ECPoint {
  if (scalar === 0n || point.isInfinity) {
    return { x: 0n, y: 0n, isInfinity: true };
  }

  const ecPoint = pointToElliptic(point);
  const result = ecPoint.mul(scalar.toString(16));
  return ellipticToPoint(result);
}

/**
 * Scalar division (multiply by modular inverse)
 */
export function pointDivide(scalar: bigint, point: ECPoint): ECPoint {
  if (scalar === 0n) {
    throw new Error('Cannot divide by zero');
  }

  // Calculate modular inverse manually using the extended Euclidean algorithm
  const inverse = modInverse(scalar, CURVE_N);

  const ecPoint = pointToElliptic(point);
  const result = ecPoint.mul(inverse.toString(16));
  return ellipticToPoint(result);
}

/**
 * Point negation (additive inverse)
 */
export function pointNegate(point: ECPoint): ECPoint {
  if (point.isInfinity) {
    return { x: 0n, y: 0n, isInfinity: true };
  }

  const ecPoint = pointToElliptic(point);
  const result = ecPoint.neg();
  return ellipticToPoint(result);
}

/**
 * Get distance between two points using ECC point subtraction
 * Returns the difference point P1 - P2 (useful for analysis but unknown private key)
 */
export function getPointDistance(p1: ECPoint, p2: ECPoint): ECPoint {
  if (p1.isInfinity || p2.isInfinity) {
    return { x: 0n, y: 0n, isInfinity: true };
  }

  // Calculate ECC point difference: P1 - P2
  return pointSubtract(p1, p2);
}

/**
 * Check if a point is on the secp256k1 curve
 */
export function isPointOnCurve(point: ECPoint): boolean {
  if (point.isInfinity) return true;

  try {
    const ecPoint = pointToElliptic(point);
    return ecPoint.validate();
  } catch {
    return false;
  }
}

/**
 * Generate a random scalar for testing
 */
export function generateRandomScalar(): bigint {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  let scalar = 0n;
  for (let i = 0; i < 32; i++) {
    scalar = (scalar << 8n) + BigInt(randomBytes[i]);
  }

  return scalar % CURVE_N;
}

/**
 * Convert bigint to hex string with padding
 */
export function bigintToHex(value: bigint, padLength: number = 64): string {
  return value.toString(16).padStart(padLength, '0');
}

/**
 * Parse hex string to bigint
 */
export function hexToBigint(hex: string): bigint {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + cleanHex);
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
export function modInverse(a: bigint, m: bigint): bigint {
  const { gcd, x } = extendedGcd(a, m);
  if (gcd !== 1n) {
    throw new Error('Inverse does not exist — numbers are not coprime.');
  }
  return ((x % m) + m) % m; // Normalize to [0, m)
}

/**
 * Extended Euclidean algorithm
 */
function extendedGcd(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  let old_r = a,
    r = b;
  let old_s = 1n,
    s = 0n;
  let old_t = 0n,
    t = 1n;

  while (r !== 0n) {
    const q = old_r / r;

    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
    [old_t, t] = [t, old_t - q * t];
  }

  return { gcd: old_r, x: old_s, y: old_t };
}

/**
 * Reconstruct private key from a series of operations
 * Enhanced to work with elliptic.js operations
 */
export function reconstructPrivateKey(
  operations: Array<{
    type: 'multiply' | 'divide' | 'add' | 'subtract';
    value: bigint | ECPoint;
    direction?: 'forward' | 'reverse';
  }>
): bigint {
  // Start with 1 (multiplying by the private key gives the public key)
  let accumulatedScalar = 1n;

  for (const op of operations.reverse()) {
    // Direction affects how we interpret the operations:
    // forward: challenge->G (normal interpretation)
    // reverse: G->challenge (inverted interpretation for key inflation)
    const isReverse = op.direction === 'reverse';

    switch (op.type) {
      case 'multiply':
        if (isReverse) {
          // In reverse mode, multiplication becomes multiplication (key inflation)
          accumulatedScalar = (accumulatedScalar * (op.value as bigint)) % CURVE_N;
        } else {
          // In forward mode, if we multiplied by k, we need to divide by k
          accumulatedScalar =
            (accumulatedScalar * modInverse(op.value as bigint, CURVE_N)) % CURVE_N;
        }
        break;
      case 'divide':
        if (isReverse) {
          // In reverse mode, division becomes division
          accumulatedScalar =
            (accumulatedScalar * modInverse(op.value as bigint, CURVE_N)) % CURVE_N;
        } else {
          // In forward mode, if we divided by k, we need to multiply by k
          accumulatedScalar = (accumulatedScalar * (op.value as bigint)) % CURVE_N;
        }
        break;
      case 'add':
        if (isReverse) {
          accumulatedScalar = (accumulatedScalar + (op.value as bigint)) % CURVE_N;
        } else {
          accumulatedScalar = (accumulatedScalar - (op.value as bigint)) % CURVE_N;
        }
        break;
      case 'subtract':
        if (isReverse) {
          accumulatedScalar = (accumulatedScalar - (op.value as bigint)) % CURVE_N;
        } else {
          accumulatedScalar = (accumulatedScalar + (op.value as bigint)) % CURVE_N;
        }
        break;
      // Point addition/subtraction operations are more complex and would require
      // tracking the specific points and operations in a different way
      default:
        throw new Error(`Operation ${op.type} not supported for private key reconstruction yet`);
    }
  }

  return accumulatedScalar;
}

/**
 * Validate that a point is valid on the curve using elliptic.js
 */
export function validatePoint(point: ECPoint): boolean {
  try {
    const ecPoint = pointToElliptic(point);
    return ecPoint.validate();
  } catch {
    return false;
  }
}

/**
 * Get point in different coordinate systems for debugging
 */
export function getPointInfo(point: ECPoint): {
  affine: { x: string; y: string };
  compressed: string;
  uncompressed: string;
} {
  if (point.isInfinity) {
    return {
      affine: { x: 'infinity', y: 'infinity' },
      compressed: 'point at infinity',
      uncompressed: 'point at infinity',
    };
  }

  const ecPoint = pointToElliptic(point);

  return {
    affine: {
      x: point.x.toString(16),
      y: point.y.toString(16),
    },
    compressed: ecPoint.encodeCompressed('hex'),
    uncompressed: ecPoint.encode('hex'),
  };
}
