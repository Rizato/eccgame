import { describe, expect, it } from 'vitest';
import {
  CURVE_N,
  CURVE_P,
  getGeneratorPoint,
  isPointOnCurve,
  pointAdd,
  pointMultiply,
  pointNegate,
  publicKeyToPoint,
  pointToPublicKey,
  modInverse,
} from './ecc';

describe('ECC utilities', () => {
  describe('Constants', () => {
    it('should have correct curve parameters', () => {
      expect(CURVE_P.toString(16)).toBe(
        'fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f'
      );
      expect(CURVE_N.toString(16)).toBe(
        'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141'
      );
    });

    it('should have correct generator point', () => {
      const generator = getGeneratorPoint();
      expect(generator.x.toString(16)).toBe(
        '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
      );
      expect(generator.y.toString(16)).toBe(
        '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'
      );
      expect(generator.isInfinity).toBe(false);
    });
  });

  describe('isPointOnCurve', () => {
    it('should validate generator point is on curve', () => {
      expect(isPointOnCurve(getGeneratorPoint())).toBe(true);
    });

    it('should validate infinity point', () => {
      expect(isPointOnCurve({ x: 0n, y: 0n, isInfinity: true })).toBe(true);
    });

    it('should reject invalid points', () => {
      expect(isPointOnCurve({ x: 1n, y: 1n, isInfinity: false })).toBe(false);
    });
  });

  describe('pointAdd', () => {
    it('should add two points correctly', () => {
      const p1 = getGeneratorPoint();
      const p2 = pointMultiply(2n, p1);
      const sum = pointAdd(p1, p2);

      expect(sum.isInfinity).toBe(false);
      expect(isPointOnCurve(sum)).toBe(true);

      // Should equal 3G
      const threeG = pointMultiply(3n, getGeneratorPoint());
      expect(sum).toEqual(threeG);
    });

    it('should handle adding point to infinity', () => {
      const infinity = { x: 0n, y: 0n, isInfinity: true };
      const result = pointAdd(getGeneratorPoint(), infinity);
      expect(result).toEqual(getGeneratorPoint());
    });

    it('should handle adding point to its negative (returns infinity)', () => {
      const negG = pointNegate(getGeneratorPoint());
      const result = pointAdd(getGeneratorPoint(), negG);
      expect(result.isInfinity).toBe(true);
    });
  });

  describe('pointNegate', () => {
    it('should negate a point correctly', () => {
      const generator = getGeneratorPoint();
      const neg = pointNegate(generator);
      expect(neg.x).toBe(generator.x);
      expect(neg.y).toBe(CURVE_P - generator.y);
      expect(neg.isInfinity).toBe(false);
    });

    it('should handle negating infinity', () => {
      const infinity = { x: 0n, y: 0n, isInfinity: true };
      const result = pointNegate(infinity);
      expect(result.isInfinity).toBe(true);
    });
  });

  describe('pointMultiply', () => {
    it('should handle point at infinity', () => {
      const infinity = { x: 0n, y: 0n, isInfinity: true };
      const result = pointMultiply(2n, infinity);
      expect(result.isInfinity).toBe(true);
    });

    it('should multiply by scalar correctly', () => {
      const doubled = pointMultiply(2n, getGeneratorPoint());
      expect(doubled.isInfinity).toBe(false);
      expect(isPointOnCurve(doubled)).toBe(true);
    });

    it('should handle multiplication by zero', () => {
      const result = pointMultiply(0n, getGeneratorPoint());
      expect(result.isInfinity).toBe(true);
    });

    it('should handle multiplication by one', () => {
      const result = pointMultiply(1n, getGeneratorPoint());
      expect(result).toEqual(getGeneratorPoint());
    });

    it('should handle negative scalars', () => {
      const result = pointMultiply(-1n, getGeneratorPoint());
      const expected = pointNegate(getGeneratorPoint());
      expect(result).toEqual(expected);
    });

    it('should handle large scalars', () => {
      const scalar = CURVE_N - 1n;
      const result = pointMultiply(scalar, getGeneratorPoint());
      expect(result.isInfinity).toBe(false);
      expect(result).toEqual(pointNegate(getGeneratorPoint()));
    });
  });

  describe('publicKeyToPoint', () => {
    it('should convert compressed public key (even y)', () => {
      const compressedKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
      const point = publicKeyToPoint(compressedKey);
      expect(point).toEqual(getGeneratorPoint());
    });

    it('should handle invalid public key', () => {
      const invalidKey = '0200000000000000000000000000000000000000000000000000000000000000';
      expect(() => publicKeyToPoint(invalidKey)).toThrow();
    });
  });

  describe('pointToPublicKey', () => {
    it('should convert point to compressed public key', () => {
      const publicKey = pointToPublicKey(getGeneratorPoint());
      expect(publicKey).toBe('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798');
    });

    it('should handle point with odd y coordinate', () => {
      const negG = pointNegate(getGeneratorPoint());
      const publicKey = pointToPublicKey(negG);
      expect(publicKey.startsWith('03')).toBe(true);
    });
  });

  describe('modInverse', () => {
    it('should calculate modular inverse correctly', () => {
      const a = 3n;
      const m = 7n;
      const inv = modInverse(a, m);
      const result = (a * inv) % m;
      expect(result).toBe(1n);
    });

    it('should throw for non-invertible values', () => {
      expect(() => modInverse(0n, 5n)).toThrow();
    });
  });
});
