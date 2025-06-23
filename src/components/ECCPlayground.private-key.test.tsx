import { describe, expect, it } from 'vitest';
import {
  getGeneratorPoint,
  pointAdd,
  pointDivide,
  pointMultiply,
  pointSubtract,
  modInverse,
  CURVE_N,
} from '../utils/ecc';
import { calculateKeyFromOperations } from '../utils/privateKeyCalculation';
import type { Operation } from '../types/ecc';

describe('ECCPlayground Private Key Calculations', () => {
  const generatorPoint = getGeneratorPoint();

  // Using the shared utility functions for consistency

  describe('Starting from G (Generator Point)', () => {
    it('should calculate private key 1 for G itself', () => {
      const operations: Operation[] = [];
      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(1n);
    });

    it('should calculate private key 2 for G * 2', () => {
      const operations: Operation[] = [{ type: 'multiply', description: '×2', value: '2' }];

      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(2n);

      // Verify the point calculation matches
      const expectedPoint = pointMultiply(2n, generatorPoint);
      const calculatedPoint = pointMultiply(privateKey, generatorPoint);
      expect(calculatedPoint.x).toBe(expectedPoint.x);
      expect(calculatedPoint.y).toBe(expectedPoint.y);
    });

    it('should calculate private key 2 for 4G / 2', () => {
      const operations: Operation[] = [
        { type: 'multiply', description: '×4', value: '4' },
        { type: 'divide', description: '÷2', value: '2' },
      ];

      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(2n);

      // Verify the point calculation matches
      const expectedPoint = pointDivide(2n, pointMultiply(4n, generatorPoint));
      const calculatedPoint = pointMultiply(privateKey, generatorPoint);
      expect(calculatedPoint.x).toBe(expectedPoint.x);
      expect(calculatedPoint.y).toBe(expectedPoint.y);
    });

    it('should calculate private key for complex operation chain', () => {
      const operations: Operation[] = [
        { type: 'multiply', description: '×3', value: '3' },
        { type: 'multiply', description: '×4', value: '4' },
        { type: 'divide', description: '÷6', value: '6' },
      ];

      // 1 * 3 * 4 / 6 = 12 / 6 = 2
      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(2n);
    });

    it('should handle hex values correctly', () => {
      const operations: Operation[] = [{ type: 'multiply', description: '×0xA', value: '0xA' }];

      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(10n); // 0xA = 10
    });
  });

  describe('Starting from Challenge Point', () => {
    const challengePrivateKey = 5n; // Example challenge private key

    it('should maintain challenge private key with no operations', () => {
      const operations: Operation[] = [];
      const privateKey = calculateKeyFromOperations(operations, challengePrivateKey);
      expect(privateKey).toBe(5n);
    });

    it('should calculate private key 10 for challenge * 2', () => {
      const operations: Operation[] = [
        { id: '1', type: 'multiply', description: '×2', value: '2' },
      ];

      const privateKey = calculateKeyFromOperations(operations, challengePrivateKey);
      expect(privateKey).toBe(10n);

      // Verify the point calculation matches
      const challengePoint = pointMultiply(challengePrivateKey, generatorPoint);
      const expectedPoint = pointMultiply(2n, challengePoint);
      const calculatedPoint = pointMultiply(privateKey, generatorPoint);
      expect(calculatedPoint.x).toBe(expectedPoint.x);
      expect(calculatedPoint.y).toBe(expectedPoint.y);
    });

    it('should calculate private key for challenge / 5 = 1 (back to G)', () => {
      const operations: Operation[] = [{ type: 'divide', description: '÷5', value: '5' }];

      const privateKey = calculateKeyFromOperations(operations, challengePrivateKey);
      expect(privateKey).toBe(1n);

      // Verify we get back to G
      const calculatedPoint = pointMultiply(privateKey, generatorPoint);
      expect(calculatedPoint.x).toBe(generatorPoint.x);
      expect(calculatedPoint.y).toBe(generatorPoint.y);
    });

    it('should handle complex operations from challenge', () => {
      const operations: Operation[] = [
        { type: 'multiply', description: '×3', value: '3' },
        { type: 'divide', description: '÷15', value: '15' },
      ];

      // 5 * 3 / 15 = 15 / 15 = 1
      const privateKey = calculateKeyFromOperations(operations, challengePrivateKey);
      expect(privateKey).toBe(1n);
    });
  });

  describe('Mathematical Equivalence Tests', () => {
    it('should verify G + G = 2G mathematically', () => {
      // Point addition: G + G should equal 2G
      const addedPoint = pointAdd(generatorPoint, generatorPoint);
      const doubledPoint = pointMultiply(2n, generatorPoint);

      expect(addedPoint.x).toBe(doubledPoint.x);
      expect(addedPoint.y).toBe(doubledPoint.y);
    });

    it('should verify G * 2 = 2G mathematically', () => {
      // These should be identical operations
      const point1 = pointMultiply(2n, generatorPoint);
      const point2 = pointMultiply(2n, generatorPoint);

      expect(point1.x).toBe(point2.x);
      expect(point1.y).toBe(point2.y);
    });

    it('should verify 4G / 2 = 2G mathematically', () => {
      const quadrupledPoint = pointMultiply(4n, generatorPoint);
      const halvedPoint = pointDivide(2n, quadrupledPoint);
      const doubledPoint = pointMultiply(2n, generatorPoint);

      expect(halvedPoint.x).toBe(doubledPoint.x);
      expect(halvedPoint.y).toBe(doubledPoint.y);
    });

    it('should verify 3G - G = 2G mathematically', () => {
      const tripledPoint = pointMultiply(3n, generatorPoint);
      const subtractedPoint = pointSubtract(tripledPoint, generatorPoint);
      const doubledPoint = pointMultiply(2n, generatorPoint);

      expect(subtractedPoint.x).toBe(doubledPoint.x);
      expect(subtractedPoint.y).toBe(doubledPoint.y);
    });
  });

  describe('Private Key Calculation Edge Cases', () => {
    it('should handle modular arithmetic correctly for large numbers', () => {
      const largeNumber = CURVE_N - 1n; // Maximum valid private key
      const operations: Operation[] = [{ type: 'multiply', description: '×2', value: '2' }];

      const privateKey = calculateKeyFromOperations(operations, largeNumber);
      const expected = (largeNumber * 2n) % CURVE_N;
      expect(privateKey).toBe(expected);
    });

    it('should handle division by finding modular inverse', () => {
      const operations: Operation[] = [{ type: 'divide', description: '÷7', value: '7' }];

      const privateKey = calculateKeyFromOperations(operations, 1n);

      // Verify that privateKey * 7 ≡ 1 (mod CURVE_N)
      const verification = (privateKey * 7n) % CURVE_N;
      expect(verification).toBe(1n);
    });

    it('should handle zero and one correctly', () => {
      const operations: Operation[] = [{ type: 'multiply', description: '×1', value: '1' }];

      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(1n);
    });

    it('should handle consecutive operations correctly', () => {
      // Test that (G * 2) * 3 = G * 6
      const operations1: Operation[] = [
        { type: 'multiply', description: '×2', value: '2' },
        { type: 'multiply', description: '×3', value: '3' },
      ];

      const operations2: Operation[] = [{ type: 'multiply', description: '×6', value: '6' }];

      const privateKey1 = calculateKeyFromOperations(operations1, 1n);
      const privateKey2 = calculateKeyFromOperations(operations2, 1n);

      expect(privateKey1).toBe(privateKey2);
      expect(privateKey1).toBe(6n);
    });

    it('should handle inverse operations (multiply then divide)', () => {
      const operations: Operation[] = [
        { type: 'multiply', description: '×7', value: '7' },
        { type: 'divide', description: '÷7', value: '7' },
      ];

      const privateKey = calculateKeyFromOperations(operations, 1n);
      expect(privateKey).toBe(1n);
    });
  });

  describe('Point Operations (Non-Scalar)', () => {
    it('should recognize when operations include point addition/subtraction', () => {
      const operations: Operation[] = [
        { type: 'multiply', description: '×2', value: '2' },
        { type: 'add', description: '+G', point: generatorPoint, value: '1' },
      ];

      // Check if all operations are scalar-only
      const hasOnlyScalarOps = operations.every(
        op => op.type === 'multiply' || op.type === 'divide'
      );
      expect(hasOnlyScalarOps).toBe(false);
    });

    it('should calculate scalar operations only when no point operations exist', () => {
      const scalarOnlyOps: Operation[] = [
        { id: '1', type: 'multiply', description: '×3', value: '3' },
        { id: '2', type: 'divide', description: '÷2', value: '2' },
      ];

      const hasOnlyScalarOps = scalarOnlyOps.every(
        op => op.type === 'multiply' || op.type === 'divide'
      );
      expect(hasOnlyScalarOps).toBe(true);

      if (hasOnlyScalarOps) {
        const privateKey = calculateKeyFromOperations(scalarOnlyOps, 1n);
        expect(privateKey).toBe((modInverse(2n, CURVE_N) * 3n) % CURVE_N);
      }
    });
  });
});
