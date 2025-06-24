import { ec as EC } from 'elliptic';
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
  scalarMultiplyWithIntermediates,
  pointMultiplyWithIntermediates,
  pointDivide,
  pointDivideWithIntermediates,
} from './ecc';

const ec = new EC('secp256k1');

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
      // (N-1)*G should equal -G
      const negatedG = pointNegate(getGeneratorPoint());
      expect(result).toEqual(negatedG);
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

  describe('scalarMultiplyWithIntermediates', () => {
    it('should return same result as doubleAndAdd but with intermediates', () => {
      const scalar = 5n;
      const generator = getGeneratorPoint();

      const { result, intermediates } = scalarMultiplyWithIntermediates(scalar, generator);
      const expectedResult = doubleAndAdd(scalar, generator);

      expect(result).toEqual(expectedResult);
      expect(intermediates).toBeDefined();
      expect(Array.isArray(intermediates)).toBe(true);
    });

    it('should produce intermediate points during computation', () => {
      const scalar = 5n; // Binary: 101, should produce intermediates
      const generator = getGeneratorPoint();

      const { intermediates } = scalarMultiplyWithIntermediates(scalar, generator);

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
      const { result, intermediates } = scalarMultiplyWithIntermediates(1n, generator);

      expect(result).toEqual(generator);
      expect(intermediates).toHaveLength(0);
    });

    it('should handle scalar 0 with no intermediates', () => {
      const generator = getGeneratorPoint();
      const { result, intermediates } = scalarMultiplyWithIntermediates(0n, generator);

      expect(result.isInfinity).toBe(true);
      expect(intermediates).toHaveLength(0);
    });

    it('should produce correct operation descriptions', () => {
      const scalar = 6n; // Binary: 110
      const generator = getGeneratorPoint();

      const { intermediates } = scalarMultiplyWithIntermediates(scalar, generator);

      // Check that we have both double and add operations
      const operationTypes = intermediates.map(i => i.operation.type);
      expect(operationTypes).toContain('multiply'); // Double operations

      const descriptions = intermediates.map(i => i.operation.description);
      expect(descriptions).toContain('Double');
    });
  });

  describe('pointMultiplyWithIntermediates', () => {
    it('should be alias for scalarMultiplyWithIntermediates', () => {
      const scalar = 7n;
      const generator = getGeneratorPoint();

      const directResult = scalarMultiplyWithIntermediates(scalar, generator);
      const aliasResult = pointMultiplyWithIntermediates(scalar, generator);

      expect(aliasResult).toEqual(directResult);
    });

    it('should provide intermediates for graph visualization', () => {
      const scalar = 10n; // Binary: 1010
      const generator = getGeneratorPoint();

      const { result, intermediates } = pointMultiplyWithIntermediates(scalar, generator);

      // Verify result matches pointMultiply
      const expected = pointMultiply(scalar, generator);
      expect(result).toEqual(expected);
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

    it('should match elliptic.js for various scalars', () => {
      const generator = getGeneratorPoint();
      const testScalars = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n];

      for (const scalar of testScalars) {
        const { result } = pointMultiplyWithIntermediates(scalar, generator);
        const expected = pointMultiply(scalar, generator);

        expect(result.x).toBe(expected.x);
        expect(result.y).toBe(expected.y);
        expect(result.isInfinity).toBe(expected.isInfinity);
      }
    });

    it('should handle private key tracking correctly', () => {
      const startingPrivateKey = 5n;
      const scalar = 3n;

      // Create a point that has private key 5 (i.e., 5G)
      const point = pointMultiply(startingPrivateKey, getGeneratorPoint());

      const { result, intermediates } = pointMultiplyWithIntermediates(
        scalar,
        point,
        startingPrivateKey
      );

      // The result should be scalar * point = 3 * (5G) = 15G
      const expectedPrivateKey = (startingPrivateKey * scalar) % CURVE_N;
      const expectedPoint = ec.g.mul(expectedPrivateKey.toString(16));
      expect(result.x).toBe(BigInt('0x' + expectedPoint.getX().toString(16)));
      expect(result.y).toBe(BigInt('0x' + expectedPoint.getY().toString(16)));

      // Check that the last intermediate has the correct private key
      if (intermediates.length > 0) {
        const lastIntermediate = intermediates[intermediates.length - 1];
        expect(lastIntermediate.privateKey).toBe(expectedPrivateKey);
      }

      // Check that intermediates have correct private keys
      for (const intermediate of intermediates) {
        if (intermediate.privateKey !== undefined) {
          // Verify this intermediate point matches its private key using elliptic.js
          const ecIntermediate = ec.g.mul(intermediate.privateKey.toString(16));
          expect(intermediate.point.x).toBe(BigInt('0x' + ecIntermediate.getX().toString(16)));
          expect(intermediate.point.y).toBe(BigInt('0x' + ecIntermediate.getY().toString(16)));
        }
      }
    });

    it('should handle edge cases correctly', () => {
      const generator = getGeneratorPoint();

      // Test scalar 0
      const { result: result0, intermediates: intermediates0 } = pointMultiplyWithIntermediates(
        0n,
        generator
      );
      expect(result0.isInfinity).toBe(true);
      expect(intermediates0).toHaveLength(0);

      // Test scalar 1
      const { result: result1, intermediates: intermediates1 } = pointMultiplyWithIntermediates(
        1n,
        generator
      );
      expect(result1).toEqual(generator);
      expect(intermediates1).toHaveLength(0);

      // Test negative scalar
      const { result: resultNeg, intermediates: _intermediatesNeg } =
        pointMultiplyWithIntermediates(-3n, generator, 2n);
      const ecThreeG = ec.g.mul('3');
      const ecNegThreeG = ecThreeG.neg();
      expect(resultNeg.x).toBe(BigInt('0x' + ecNegThreeG.getX().toString(16)));
      expect(resultNeg.y).toBe(BigInt('0x' + ecNegThreeG.getY().toString(16)));
    });
  });

  describe('pointDivideWithIntermediates', () => {
    it('should be equivalent to pointMultiplyWithIntermediates with modular inverse', () => {
      const generator = getGeneratorPoint();
      const scalar = 7n;
      const inverse = modInverse(scalar, CURVE_N);

      const { result: divideResult, intermediates: _divideIntermediates } =
        pointDivideWithIntermediates(scalar, generator);
      const { result: multiplyResult, intermediates: _multiplyIntermediates } =
        pointMultiplyWithIntermediates(inverse, generator);

      expect(divideResult.x).toBe(multiplyResult.x);
      expect(divideResult.y).toBe(multiplyResult.y);
      expect(divideResult.isInfinity).toBe(multiplyResult.isInfinity);
    });

    it('should match elliptic.js for division operations', () => {
      const generator = getGeneratorPoint();
      const testDivisors = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n];

      for (const divisor of testDivisors) {
        const { result } = pointDivideWithIntermediates(divisor, generator);
        const expected = pointDivide(divisor, generator);

        expect(result.x).toBe(expected.x);
        expect(result.y).toBe(expected.y);
        expect(result.isInfinity).toBe(expected.isInfinity);
      }
    });

    it('should handle private key tracking for division', () => {
      const startingPrivateKey = 15n;
      const divisor = 3n;

      // Create a point that has private key 15 (i.e., 15G)
      const point = pointMultiply(startingPrivateKey, getGeneratorPoint());

      const { result, intermediates: _intermediates } = pointDivideWithIntermediates(
        divisor,
        point,
        startingPrivateKey
      );

      // The final private key should be startingPrivateKey / divisor = 15 / 3 = 5
      const inverse = modInverse(divisor, CURVE_N);
      const expectedPrivateKey = (startingPrivateKey * inverse) % CURVE_N;

      // Verify the final point matches the expected private key using elliptic.js
      const ecResult = ec.g.mul(expectedPrivateKey.toString(16));
      expect(result.x).toBe(BigInt('0x' + ecResult.getX().toString(16)));
      expect(result.y).toBe(BigInt('0x' + ecResult.getY().toString(16)));
    });

    it('should throw error for division by zero', () => {
      const generator = getGeneratorPoint();
      expect(() => pointDivideWithIntermediates(0n, generator)).toThrow('Cannot divide by zero');
    });

    it('should verify division cancels multiplication', () => {
      const generator = getGeneratorPoint();
      const scalar = 7n;

      // First multiply by scalar
      const { result: multiplied } = pointMultiplyWithIntermediates(scalar, generator);

      // Then divide by the same scalar
      const { result: divided } = pointDivideWithIntermediates(scalar, multiplied);

      // Should get back to the original point
      expect(divided.x).toBe(generator.x);
      expect(divided.y).toBe(generator.y);
    });
  });

  describe('ECCCalculator Operations Verification', () => {
    it('should verify multiplication operations produce correct final points', () => {
      const generator = getGeneratorPoint();
      const testCases = [
        { scalar: 2n, description: '×2' },
        { scalar: 3n, description: '×3' },
        { scalar: 5n, description: '×5' },
        { scalar: 7n, description: '×7' },
        { scalar: 11n, description: '×11' },
        { scalar: 13n, description: '×13' },
        { scalar: 17n, description: '×17' },
        { scalar: 19n, description: '×19' },
        { scalar: 23n, description: '×23' },
        { scalar: 29n, description: '×29' },
      ];

      for (const testCase of testCases) {
        const { result } = pointMultiplyWithIntermediates(testCase.scalar, generator);
        const expected = pointMultiply(testCase.scalar, generator);

        expect(result.x).toBe(expected.x);
        expect(result.y).toBe(expected.y);
        expect(result.isInfinity).toBe(expected.isInfinity);
      }
    });

    it('should verify division operations produce correct final points', () => {
      const generator = getGeneratorPoint();
      const testCases = [
        { scalar: 2n, description: '÷2' },
        { scalar: 3n, description: '÷3' },
        { scalar: 5n, description: '÷5' },
        { scalar: 7n, description: '÷7' },
        { scalar: 11n, description: '÷11' },
        { scalar: 13n, description: '÷13' },
        { scalar: 17n, description: '÷17' },
        { scalar: 19n, description: '÷19' },
        { scalar: 23n, description: '÷23' },
        { scalar: 29n, description: '÷29' },
      ];

      for (const testCase of testCases) {
        const { result } = pointDivideWithIntermediates(testCase.scalar, generator);
        const expected = pointDivide(testCase.scalar, generator);

        expect(result.x).toBe(expected.x);
        expect(result.y).toBe(expected.y);
        expect(result.isInfinity).toBe(expected.isInfinity);
      }
    });

    it('should verify complex operation chains produce correct results', () => {
      const generator = getGeneratorPoint();

      // Test: G * 3 * 5 / 2 = G * 7.5 (which should be G * (15/2 mod N))
      const { result: step1 } = pointMultiplyWithIntermediates(3n, generator);
      const { result: step2 } = pointMultiplyWithIntermediates(5n, step1);
      const { result: final } = pointDivideWithIntermediates(2n, step2);

      // Calculate expected: G * (3 * 5 / 2) = G * (15 / 2) = G * (15 * modInverse(2))
      const expectedScalar = (15n * modInverse(2n, CURVE_N)) % CURVE_N;
      const ecExpected = ec.g.mul(expectedScalar.toString(16));

      expect(final.x).toBe(BigInt('0x' + ecExpected.getX().toString(16)));
      expect(final.y).toBe(BigInt('0x' + ecExpected.getY().toString(16)));
    });

    it('should verify operations from non-generator points', () => {
      const generator = getGeneratorPoint();
      const point3G = pointMultiply(3n, generator); // Start from 3G

      // Test: 3G * 4 = 12G
      const { result: multiplied } = pointMultiplyWithIntermediates(4n, point3G);
      const expected12G = pointMultiply(12n, generator);
      expect(multiplied.x).toBe(expected12G.x);
      expect(multiplied.y).toBe(expected12G.y);

      // Test: 12G / 3 = 4G
      const { result: divided } = pointDivideWithIntermediates(3n, multiplied);
      const expected4G = pointMultiply(4n, generator);
      expect(divided.x).toBe(expected4G.x);
      expect(divided.y).toBe(expected4G.y);
    });

    it('should verify private key propagation through intermediates', () => {
      const generator = getGeneratorPoint();
      const startingPrivateKey = 5n;

      // Create a point that has private key 5 (i.e., 5G)
      const point = pointMultiply(startingPrivateKey, generator);

      // Test: (5G) * 3 with starting private key 5
      const { result, intermediates } = pointMultiplyWithIntermediates(
        3n,
        point,
        startingPrivateKey
      );

      // Result should be 3 * (5G) = 15G
      const expectedPrivateKey = 15n;
      const expected15G = pointMultiply(expectedPrivateKey, generator);
      expect(result.x).toBe(expected15G.x);
      expect(result.y).toBe(expected15G.y);

      // Check that all intermediates with private keys are correct
      for (const intermediate of intermediates) {
        if (intermediate.privateKey !== undefined) {
          const intermediatePoint = pointMultiply(intermediate.privateKey, generator);
          expect(intermediate.point.x).toBe(intermediatePoint.x);
          expect(intermediate.point.y).toBe(intermediatePoint.y);
        }
      }
    });

    it('should verify large scalar operations', () => {
      const generator = getGeneratorPoint();
      const largeScalar = CURVE_N - 1n;

      const { result } = pointMultiplyWithIntermediates(largeScalar, generator);
      const expected = pointMultiply(largeScalar, generator);

      expect(result.x).toBe(expected.x);
      expect(result.y).toBe(expected.y);
      expect(result.isInfinity).toBe(expected.isInfinity);
    });

    it('should verify that multiplication and division are inverse operations', () => {
      const generator = getGeneratorPoint();
      const testScalars = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n];

      for (const scalar of testScalars) {
        // Test: G * scalar / scalar = G
        const { result: multiplied } = pointMultiplyWithIntermediates(scalar, generator);
        const { result: final } = pointDivideWithIntermediates(scalar, multiplied);

        expect(final.x).toBe(generator.x);
        expect(final.y).toBe(generator.y);
        expect(final.isInfinity).toBe(generator.isInfinity);
      }
    });
  });

  describe('Private Key Generation Tests', () => {
    it('should track private key correctly when starting from G', () => {
      const generator = getGeneratorPoint();
      const scalar = 5n;

      const { result, intermediates } = scalarMultiplyWithIntermediates(
        scalar,
        generator,
        1n // starting private key for G
      );

      // The final private key should be 1 * 5 = 5
      const expectedPrivateKey = 5n;
      const expectedPoint = pointMultiply(expectedPrivateKey, generator);

      expect(result.x).toBe(expectedPoint.x);
      expect(result.y).toBe(expectedPoint.y);

      // Verify that the final intermediate has the correct private key
      if (intermediates.length > 0) {
        const lastIntermediate = intermediates[intermediates.length - 1];
        expect(lastIntermediate.privateKey).toBe(expectedPrivateKey);
      }
    });

    it('should track private key correctly when starting from a non-G point', () => {
      const generator = getGeneratorPoint();
      const point3G = pointMultiply(3n, generator); // 3G
      const scalar = 4n;

      const { result, intermediates } = scalarMultiplyWithIntermediates(
        scalar,
        point3G,
        3n // starting private key for 3G
      );

      // The result should be 4 * point3G = 4 * 3G = 12G
      const expected12G = pointMultiply(12n, generator);
      expect(result.x).toBe(expected12G.x);
      expect(result.y).toBe(expected12G.y);

      // The final private key should be 3 * 4 = 12
      const expectedPrivateKey = 12n;

      // Verify that the final intermediate has the correct private key
      if (intermediates.length > 0) {
        const lastIntermediate = intermediates[intermediates.length - 1];
        expect(lastIntermediate.privateKey).toBe(expectedPrivateKey);
      }
    });

    it('should handle private key tracking without starting private key', () => {
      const generator = getGeneratorPoint();
      const scalar = 7n;

      const { result, intermediates } = scalarMultiplyWithIntermediates(
        scalar,
        generator
        // No starting private key
      );

      // Should still produce correct result
      const expectedPoint = pointMultiply(scalar, generator);
      expect(result.x).toBe(expectedPoint.x);
      expect(result.y).toBe(expectedPoint.y);

      // But intermediates should not have private keys
      for (const intermediate of intermediates) {
        expect(intermediate.privateKey).toBeUndefined();
      }
    });

    it('should verify private key propagation through all intermediates', () => {
      const generator = getGeneratorPoint();
      const scalar = 6n; // Binary: 110, should have intermediates
      const startingPrivateKey = 2n;

      // Create a point that has private key 2 (i.e., 2G)
      const point = pointMultiply(startingPrivateKey, generator);

      const { result, intermediates } = scalarMultiplyWithIntermediates(
        scalar,
        point,
        startingPrivateKey
      );

      // Result should be 6 * (2G) = 12G
      const expectedPrivateKey = 12n;
      const expected12G = pointMultiply(expectedPrivateKey, generator);
      expect(result.x).toBe(expected12G.x);
      expect(result.y).toBe(expected12G.y);

      // Check that all intermediates with private keys are correct
      for (const intermediate of intermediates) {
        if (intermediate.privateKey !== undefined) {
          const intermediatePoint = pointMultiply(intermediate.privateKey, generator);
          expect(intermediate.point.x).toBe(intermediatePoint.x);
          expect(intermediate.point.y).toBe(intermediatePoint.y);
        }
      }
    });

    it('should handle edge cases for private key tracking', () => {
      const generator = getGeneratorPoint();

      // Test scalar 1
      const { result: result1, intermediates: intermediates1 } = scalarMultiplyWithIntermediates(
        1n,
        generator,
        5n
      );
      expect(result1).toEqual(generator);
      expect(intermediates1).toHaveLength(0);

      // Test scalar 0
      const { result: result0, intermediates: intermediates0 } = scalarMultiplyWithIntermediates(
        0n,
        generator,
        5n
      );
      expect(result0.isInfinity).toBe(true);
      expect(intermediates0).toHaveLength(0);

      // Test negative scalar
      const { result: resultNeg, intermediates: _intermediatesNeg } =
        scalarMultiplyWithIntermediates(-3n, generator, 2n);
      const ecThreeG = ec.g.mul('3');
      const ecNegThreeG = ecThreeG.neg();
      expect(resultNeg.x).toBe(BigInt('0x' + ecNegThreeG.getX().toString(16)));
      expect(resultNeg.y).toBe(BigInt('0x' + ecNegThreeG.getY().toString(16)));
    });

    it('should verify private key tracking matches elliptic.js results', () => {
      const generator = getGeneratorPoint();
      const testCases = [
        { scalar: 2n, startingKey: 1n, expectedKey: 2n },
        { scalar: 3n, startingKey: 1n, expectedKey: 3n },
        { scalar: 5n, startingKey: 2n, expectedKey: 10n },
        { scalar: 7n, startingKey: 3n, expectedKey: 21n },
        { scalar: 11n, startingKey: 1n, expectedKey: 11n },
      ];

      for (const testCase of testCases) {
        const { result, intermediates } = scalarMultiplyWithIntermediates(
          testCase.scalar,
          generator,
          testCase.startingKey
        );

        // Verify final result is scalar * G
        const ecResult = ec.g.mul(testCase.scalar.toString(16));
        expect(result.x).toBe(BigInt('0x' + ecResult.getX().toString(16)));
        expect(result.y).toBe(BigInt('0x' + ecResult.getY().toString(16)));

        // Verify final private key is correct
        if (intermediates.length > 0) {
          const lastIntermediate = intermediates[intermediates.length - 1];
          expect(lastIntermediate.privateKey).toBe(testCase.expectedKey);
        }
      }
    });

    it('should verify private key tracking for division operations', () => {
      const generator = getGeneratorPoint();
      const divisor = 3n;
      const startingPrivateKey = 15n;

      const { result, intermediates } = pointDivideWithIntermediates(
        divisor,
        generator,
        startingPrivateKey
      );

      // The result should be G / 3
      const inverse = modInverse(divisor, CURVE_N);
      const expectedPoint = pointMultiply(inverse, generator);
      expect(result.x).toBe(expectedPoint.x);
      expect(result.y).toBe(expectedPoint.y);

      // The final private key should be 15 / 3 = 5 (using modular inverse)
      const expectedPrivateKey = (startingPrivateKey * inverse) % CURVE_N;

      // Verify that the final intermediate has the correct private key
      if (intermediates.length > 0) {
        const lastIntermediate = intermediates[intermediates.length - 1];
        expect(lastIntermediate.privateKey).toBe(expectedPrivateKey);
      }
    });

    it('should verify private key tracking for complex operation chains', () => {
      const generator = getGeneratorPoint();
      const startingPrivateKey = 1n;

      // Test: G * 3 * 4 = G * 12
      const { result: step1, intermediates: _intermediates1 } = scalarMultiplyWithIntermediates(
        3n,
        generator,
        startingPrivateKey
      );

      const { result: final, intermediates: intermediates2 } = scalarMultiplyWithIntermediates(
        4n,
        step1,
        3n // private key of step1 result
      );

      // Final private key should be 1 * 3 * 4 = 12
      const expectedPrivateKey = 12n;
      const expectedPoint = pointMultiply(expectedPrivateKey, generator);

      expect(final.x).toBe(expectedPoint.x);
      expect(final.y).toBe(expectedPoint.y);

      // Verify final intermediate has correct private key
      if (intermediates2.length > 0) {
        const lastIntermediate = intermediates2[intermediates2.length - 1];
        expect(lastIntermediate.privateKey).toBe(expectedPrivateKey);
      }
    });
  });

  describe('Debug Tests - Simple Cases', () => {
    it('should demonstrate the bug in scalarMultiplyWithIntermediates', () => {
      const generator = getGeneratorPoint();

      // Test with scalar 2 - this should be simple
      const { result: result2 } = scalarMultiplyWithIntermediates(2n, generator);
      const expected2 = pointMultiply(2n, generator);

      console.log('Scalar 2:');
      console.log('Expected:', expected2.x.toString(16));
      console.log('Got:     ', result2.x.toString(16));
      console.log('Match:   ', result2.x === expected2.x);

      // Test with scalar 3
      const { result: result3 } = scalarMultiplyWithIntermediates(3n, generator);
      const expected3 = pointMultiply(3n, generator);

      console.log('Scalar 3:');
      console.log('Expected:', expected3.x.toString(16));
      console.log('Got:     ', result3.x.toString(16));
      console.log('Match:   ', result3.x === expected3.x);

      // The results should match, but they don't
      expect(result2.x).toBe(expected2.x);
      expect(result3.x).toBe(expected3.x);
    });

    it('should show what the algorithm is actually doing', () => {
      const generator = getGeneratorPoint();
      const scalar = 2n;

      // Let's trace through what the current algorithm does
      const binaryScalar = scalar.toString(2); // "10"
      const rounds = binaryScalar.length - 1; // 1

      console.log('Binary scalar:', binaryScalar);
      console.log('Rounds:', rounds);

      // The current algorithm starts with the original point and doubles it
      // This is wrong - it should start with infinity and build up

      const { result, intermediates } = scalarMultiplyWithIntermediates(scalar, generator);

      console.log('Intermediates:', intermediates.length);
      for (let i = 0; i < intermediates.length; i++) {
        const intermediate = intermediates[i];
        console.log(
          `  ${i}: ${intermediate.operation.description} -> (${intermediate.point.x.toString(16).slice(0, 16)}...)`
        );
      }

      // This should be 2G, but it's not
      const expected = pointMultiply(2n, generator);
      expect(result.x).toBe(expected.x);
    });
  });

  describe('Debug - Compare Intermediates', () => {
    it('should print intermediates for scalar 3', () => {
      const generator = getGeneratorPoint();
      const scalar = 3n;
      const { result, intermediates } = scalarMultiplyWithIntermediates(scalar, generator);
      const expected = pointMultiply(scalar, generator);
      console.log('Intermediates:');
      intermediates.forEach((step, i) => {
        console.log(
          `${i}: ${step.operation.description} (${step.operation.type}) -> x: ${step.point.x.toString(16).slice(0, 8)}... y: ${step.point.y.toString(16).slice(0, 8)}... pk: ${step.privateKey}`
        );
      });
      console.log('Result:', result.x.toString(16), result.y.toString(16));
      console.log('Expected:', expected.x.toString(16), expected.y.toString(16));
      expect(result.x).toBe(expected.x);
      expect(result.y).toBe(expected.y);
    });

    it('should debug division issue', () => {
      const generator = getGeneratorPoint();
      const scalar = 7n;

      // Multiply by 7
      const multiplied = pointMultiply(scalar, generator);
      console.log('7G x:', multiplied.x.toString(16));

      // Divide by 7
      const divided = pointDivide(scalar, multiplied);
      console.log('7G/7 x:', divided.x.toString(16));
      console.log('G x:', generator.x.toString(16));

      // Check with elliptic.js
      const ecSevenG = ec.g.mul('7');
      const inv7 = modInverse(7n, CURVE_N);
      const ecDivided = ecSevenG.mul(inv7.toString(16));
      console.log('Elliptic 7G/7 x:', ecDivided.getX().toString(16));

      expect(divided.x).toBe(generator.x);
    });
  });
});
