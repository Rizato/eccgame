/**
 * ECC POINT MANIPULATION UTILITIES
 *
 * Extended cryptographic utilities for elliptic curve operations
 * using elliptic.js for robust and performant curve arithmetic.
 */
import { ec as EC } from 'elliptic';
import * as secp256k1 from 'secp256k1';
import { OperationType, type ECPoint, type IntermediatePoint } from '../types/ecc.ts';
import { bytesToHex, hexToBytes } from './crypto';

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
 * Scalar multiplication using double-and-add algorithm
 * Returns just the result point
 */
export function pointMultiply(scalar: bigint, point: ECPoint): ECPoint {
  const ecPoint = pointToElliptic(point);
  // Ensure scalar is properly normalized
  scalar = ((scalar % CURVE_N) + CURVE_N) % CURVE_N;
  const result = ecPoint.mul(scalar.toString(16));
  return ellipticToPoint(result);
}

/**
 * Double-and-add algorithm that returns intermediate points
 * Optimized to use elliptic.js points internally to avoid conversion overhead
 *
 * if startingPrivateKey is provided, it must be the private key for the given point
 */
export function scalarMultiplyWithIntermediates(
  scalar: bigint,
  point: ECPoint,
  startingPrivateKey?: bigint
): { result: ECPoint; intermediates: IntermediatePoint[] } {
  if (scalar === 0n || point.isInfinity) {
    return {
      result: { x: 0n, y: 0n, isInfinity: true },
      intermediates: [],
    };
  }

  if (scalar === 1n) {
    return { result: point, intermediates: [] };
  }

  // Handle negative scalars
  if (scalar < 0n) {
    const negated = pointNegate(point);
    return scalarMultiplyWithIntermediates(-scalar, negated, startingPrivateKey);
  }

  scalar = scalar % CURVE_N;
  if (scalar === 0n) {
    return {
      result: { x: 0n, y: 0n, isInfinity: true },
      intermediates: [],
    };
  }

  // Use proper double-and-add algorithm for both result and intermediates
  const intermediates: IntermediatePoint[] = [];
  const binaryScalar = scalar.toString(2);

  // Convert to elliptic.js points for operations
  const ecPoint = pointToElliptic(point);

  // Initialize with point at infinity
  let currentPoint = ec.curve.point(null, null); // Point at infinity

  // Track the corresponding private key
  let currentPrivateKey = startingPrivateKey !== undefined ? 0n : undefined;

  // Process bits from most significant to least significant
  for (let i = 0; i < binaryScalar.length; i++) {
    const bit = binaryScalar[i];

    if (i > 0) {
      // Double the current point (except for the first bit)
      currentPoint = currentPoint.dbl();
      if (currentPrivateKey !== undefined && startingPrivateKey !== undefined) {
        currentPrivateKey = (currentPrivateKey * 2n) % CURVE_N;
      }

      intermediates.push({
        point: ellipticToPoint(currentPoint),
        operation: {
          type: OperationType.MULTIPLY,
          description: 'Double',
          value: '',
          userCreated: false,
        },
        privateKey: currentPrivateKey,
      });
    }

    if (bit === '1') {
      // Add the original point
      currentPoint = currentPoint.add(ecPoint);
      if (currentPrivateKey !== undefined && startingPrivateKey !== undefined) {
        currentPrivateKey = (currentPrivateKey + startingPrivateKey) % CURVE_N;
      }

      intermediates.push({
        point: ellipticToPoint(currentPoint),
        operation: {
          type: OperationType.ADD,
          description: 'Add',
          value: '',
          userCreated: false,
        },
        privateKey: currentPrivateKey,
      });
    }
  }

  // The final result is the last point from our double-and-add algorithm
  const result = ellipticToPoint(currentPoint);

  return { result, intermediates };
}

// Alias for backward compatibility
/**
 * Scalar division using double-and-add algorithm via modular inverse
 * Returns just the result point
 */
export function pointDivide(scalar: bigint, point: ECPoint): ECPoint {
  if (scalar === 0n) {
    throw new Error('Cannot divide by zero');
  }

  // Calculate modular inverse
  const inverse = modInverse(scalar, CURVE_N);

  // Use pointMultiply with the inverse
  return pointMultiply(inverse, point);
}

/**
 * Scalar division with intermediate points for graph tracking
 * Returns result and intermediates
 */
export function pointDivideWithIntermediates(
  scalar: bigint,
  point: ECPoint,
  startingPrivateKey?: bigint
): { result: ECPoint; intermediates: IntermediatePoint[] } {
  if (scalar === 0n) {
    throw new Error('Cannot divide by zero');
  }

  // Calculate modular inverse
  const inverse = modInverse(scalar, CURVE_N);

  // Use pointMultiply with the inverse
  return scalarMultiplyWithIntermediates(inverse, point, startingPrivateKey);
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

// Update all references in this file
export function doubleAndAdd(scalar: bigint, point: ECPoint): ECPoint {
  const { result } = scalarMultiplyWithIntermediates(scalar, point);
  return result;
}

export function pointMultiplyWithIntermediates(
  scalar: bigint,
  point: ECPoint,
  startingPrivateKey?: bigint
): { result: ECPoint; intermediates: IntermediatePoint[] } {
  return scalarMultiplyWithIntermediates(scalar, point, startingPrivateKey);
}
