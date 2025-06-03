import { describe, expect, it } from 'vitest';
import { CURVE_N, hexToBigint, modInverse } from './ecc';
import { type Operation } from './privateKeyCalculation';
import { calculateVictoryPrivateKey } from './victoryPrivateKeyCalculation';

describe('calculateVictoryPrivateKey', () => {
  describe('Generator mode starting point', () => {
    it('should return 1 for empty operations array', () => {
      const operations: Operation[] = [];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      expect(result).toBe(1n);
    });

    it('should calculate private key for single multiply operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 5',
          value: '5',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      expect(result).toBe(5n);
    });

    it('should calculate private key for single add operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ 10',
          value: '10',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      expect(result).toBe(11n); // 1 + 10
    });

    it('should calculate private key for single subtract operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'subtract',
          description: '- 3',
          value: '3',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // 1 - 3 = -2, but in modular arithmetic this becomes CURVE_N - 2
      expect(result).toBe(CURVE_N - 2n);
    });

    it('should calculate private key for single divide operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'divide',
          description: '/ 2',
          value: '2',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // 1 / 2 = 1 * modInverse(2, CURVE_N)
      const expectedInverse = modInverse(2n, CURVE_N);
      expect(result).toBe(expectedInverse);
    });

    it('should calculate private key for multiple operations', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 2',
          value: '2',
        },
        {
          id: 'op2',
          type: 'add',
          description: '+ 5',
          value: '5',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // (1 * 2) + 5 = 7
      expect(result).toBe(7n);
    });

    it('should handle hex values', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 0xFF',
          value: '0xFF',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      expect(result).toBe(255n); // 0xFF = 255
    });

    it('should handle large values with modular arithmetic', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ CURVE_N',
          value: CURVE_N.toString(),
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // (1 + CURVE_N) % CURVE_N = 1
      expect(result).toBe(1n);
    });
  });

  describe('Challenge mode starting point', () => {
    it('should handle empty operations array', () => {
      const operations: Operation[] = [];
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(result).toBe(1n);
    });

    it('should calculate private key for single multiply operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 7',
          value: '7',
        },
      ];

      const actualKey = modInverse(7n, CURVE_N);
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });

    it('should calculate private key for single add operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ 15',
          value: '15',
        },
      ];
      const actualKey = CURVE_N - 14n;
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });

    it('should calculate private key for single subtract operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'subtract',
          description: '- 8',
          value: '8',
        },
      ];
      const actualKey = 9n;
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });

    it('should calculate private key for single divide operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'divide',
          description: '/ 4',
          value: '4',
        },
      ];
      const actualKey = 4n;
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });

    it('should handle infinity case', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'subtract',
          description: '-2',
          value: '2',
        },
      ];
      const actualKey = 2n;
      const result = calculateVictoryPrivateKey(operations, 'challenge', true);
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });

    it('should add infinity correction when at infinity', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ 5',
          value: '5',
        },
      ];

      const resultNormal = calculateVictoryPrivateKey(operations, 'challenge', false);
      const resultInfinity = calculateVictoryPrivateKey(operations, 'challenge', true);

      // Results should be different when infinity correction is applied
      expect(resultNormal - 1n).toBe(resultInfinity);
    });

    it('should handle hex values in challenge mode', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 0x10',
          value: '0x10',
        },
      ];
      const actualKey = modInverse(16n, CURVE_N);
      const result = calculateVictoryPrivateKey(operations, 'challenge');
      expect(typeof result).toBe('bigint');
      expect(result).toBe(actualKey);
    });
  });

  describe('Edge cases', () => {
    it('should handle operations with empty values', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* (empty)',
          value: '',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // Empty value should be ignored, so result should be 1 (starting value)
      expect(result).toBe(1n);
    });

    it('should handle mixed operation sequence', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 3',
          value: '3',
        },
        {
          id: 'op2',
          type: 'add',
          description: '+ 7',
          value: '7',
        },
        {
          id: 'op3',
          type: 'divide',
          description: '/ 2',
          value: '2',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      // ((1 * 3) + 7) / 2 = 10 / 2 = 5
      const step1 = 1n * 3n; // 3
      const step2 = step1 + 7n; // 10
      const step3 = (step2 * modInverse(2n, CURVE_N)) % CURVE_N; // 5
      expect(result).toBe(step3);
    });

    it('should handle very large hex values', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ 0xFFFFFFFFFFFFFFFF',
          value: '0xFFFFFFFFFFFFFFFF',
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      const expectedValue = (1n + hexToBigint('0xFFFFFFFFFFFFFFFF')) % CURVE_N;
      expect(result).toBe(expectedValue);
    });

    it('should maintain result within curve order bounds', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* large',
          value: (CURVE_N - 1n).toString(),
        },
      ];
      const result = calculateVictoryPrivateKey(operations, 'generator');
      expect(result >= 0n).toBe(true);
      expect(result < CURVE_N).toBe(true);
    });
  });
});
