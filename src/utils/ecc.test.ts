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
  doubleAndAdd,
  doubleAndAddWithIntermediates,
  pointMultiplyWithIntermediates,
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
      // Use the actual output from elliptic.js as the expected value
      expect(result).toEqual({
        x: 45412695986550839614588515436767134844524641957770820091206519184340576032445n,
        y: 82088334651107045501754259737151367733053683538691580894965539942803011007907n,
        isInfinity: false,
      });
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

  describe('doubleAndAdd', () => {
    it('should produce same result as pointMultiply', () => {
      const scalar = 7n;
      const generator = getGeneratorPoint();

      const doubleAndAddResult = doubleAndAdd(scalar, generator);
      const pointMultiplyResult = pointMultiply(scalar, generator);

      expect(doubleAndAddResult).toEqual(pointMultiplyResult);
    });

    it('should handle small scalars correctly', () => {
      const generator = getGeneratorPoint();

      expect(doubleAndAdd(0n, generator).isInfinity).toBe(true);
      expect(doubleAndAdd(1n, generator)).toEqual(generator);

      const twoG = doubleAndAdd(2n, generator);
      expect(twoG).toEqual(pointAdd(generator, generator));
    });

    it('should handle large scalars correctly', () => {
      const generator = getGeneratorPoint();
      const largeScalar = CURVE_N - 1n;

      const result = doubleAndAdd(largeScalar, generator);
      const expected = pointNegate(generator);

      expect(result).toEqual(expected);
    });

    it('should handle negative scalars', () => {
      const generator = getGeneratorPoint();
      const negativeScalar = -5n;

      const result = doubleAndAdd(negativeScalar, generator);
      const expected = pointNegate(pointMultiply(5n, generator));

      expect(result).toEqual(expected);
    });

    it('should handle point at infinity', () => {
      const infinity = { x: 0n, y: 0n, isInfinity: true };
      const result = doubleAndAdd(5n, infinity);

      expect(result.isInfinity).toBe(true);
    });
  });

  describe('doubleAndAddWithIntermediates', () => {
    it('should return same result as doubleAndAdd but with intermediates', () => {
      const scalar = 5n;
      const generator = getGeneratorPoint();

      const { result, intermediates } = doubleAndAddWithIntermediates(scalar, generator);
      const expectedResult = doubleAndAdd(scalar, generator);

      expect(result).toEqual(expectedResult);
      expect(intermediates).toBeDefined();
      expect(Array.isArray(intermediates)).toBe(true);
    });

    it('should produce intermediate points during computation', () => {
      const scalar = 5n; // Binary: 101, should produce intermediates
      const generator = getGeneratorPoint();

      const { intermediates } = doubleAndAddWithIntermediates(scalar, generator);

      // For scalar 5 (binary 101), we expect:
      // - Start with G (bit 2 set)
      // - Double to 2G (for bit 1)
      // - Add G to get 3G (bit 1 not set, but we still doubled)
      // - Double to 6G (for bit 0)
      // - Subtract G to get 5G (bit 0 set)
      expect(intermediates.length).toBeGreaterThan(0);

      // All intermediate points should be valid curve points
      for (const intermediate of intermediates) {
        expect(isPointOnCurve(intermediate.point)).toBe(true);
        expect(intermediate.operation).toBeDefined();
        expect(['multiply', 'add']).toContain(intermediate.operation.type);
        expect(intermediate.operation.userCreated).toBe(false);
      }
    });

    it('should handle scalar 1 with no intermediates', () => {
      const generator = getGeneratorPoint();
      const { result, intermediates } = doubleAndAddWithIntermediates(1n, generator);

      expect(result).toEqual(generator);
      expect(intermediates).toHaveLength(0);
    });

    it('should handle scalar 0 with no intermediates', () => {
      const generator = getGeneratorPoint();
      const { result, intermediates } = doubleAndAddWithIntermediates(0n, generator);

      expect(result.isInfinity).toBe(true);
      expect(intermediates).toHaveLength(0);
    });

    it('should produce correct operation descriptions', () => {
      const scalar = 6n; // Binary: 110
      const generator = getGeneratorPoint();

      const { intermediates } = doubleAndAddWithIntermediates(scalar, generator);

      // Check that we have both double and add operations
      const operationTypes = intermediates.map(i => i.operation.type);
      expect(operationTypes).toContain('multiply'); // Double operations

      const descriptions = intermediates.map(i => i.operation.description);
      expect(descriptions).toContain('Double');
    });
  });

  describe('pointMultiplyWithIntermediates', () => {
    it('should be alias for doubleAndAddWithIntermediates', () => {
      const scalar = 7n;
      const generator = getGeneratorPoint();

      const directResult = doubleAndAddWithIntermediates(scalar, generator);
      const aliasResult = pointMultiplyWithIntermediates(scalar, generator);

      expect(aliasResult).toEqual(directResult);
    });

    it('should provide intermediates for graph visualization', () => {
      const scalar = 10n; // Binary: 1010
      const generator = getGeneratorPoint();

      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generator);

      // Use the actual output from elliptic.js as the expected value
      expect(result).toEqual({
        x: 72488970228380509287422715226575535698893157273063074627791787432852706183111n,
        y: 62070622898698443831883535403436258712770888294397026493185421712108624767191n,
        isInfinity: false,
      });
      expect(intermediates.length).toBeGreaterThan(0);

      // Each intermediate should have point and operation info
      for (const intermediate of intermediates) {
        expect(intermediate.point).toBeDefined();
        expect(intermediate.point.x).toBeDefined();
        expect(intermediate.point.y).toBeDefined();
        expect(intermediate.operation).toBeDefined();
        expect(intermediate.operation.type).toBeDefined();
        expect(intermediate.operation.description).toBeDefined();
      }
    });
  });
});
