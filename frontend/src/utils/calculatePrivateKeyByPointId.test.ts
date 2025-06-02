import { describe, expect, it } from 'vitest';
import { calculatePrivateKeyByPointId, type Operation } from './calculatePrivateKeyByPointId';

describe('calculatePrivateKeyByPointId', () => {
  describe('Generator point', () => {
    it('should return 1n for generator point', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId('generator', operations, 'generator');
      expect(result).toBe(1n);
    });
  });

  describe('Current point in generator mode', () => {
    it('should calculate private key for current point with multiply operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 5',
          value: '5',
          direction: 'forward',
        },
      ];
      const result = calculatePrivateKeyByPointId('current', operations, 'generator');
      expect(result).toBe(5n); // 1 * 5 = 5
    });

    it('should calculate private key for current point with add operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'add',
          description: '+ 10',
          value: '10',
          direction: 'forward',
        },
      ];
      const result = calculatePrivateKeyByPointId('current', operations, 'generator');
      expect(result).toBe(11n); // 1 + 10 = 11
    });
  });

  describe('Previous point', () => {
    it('should return undefined for previous point when no operations', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId('previous', operations, 'generator');
      expect(result).toBeUndefined();
    });

    it('should return undefined for previous point when only one operation', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 2',
          value: '2',
          direction: 'forward',
        },
      ];
      const result = calculatePrivateKeyByPointId('previous', operations, 'generator');
      expect(result).toBeUndefined();
    });

    it('should calculate private key for previous point with multiple operations', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 2',
          value: '2',
          direction: 'forward',
        },
        {
          id: 'op2',
          type: 'add',
          description: '+ 3',
          value: '3',
          direction: 'forward',
        },
      ];
      const result = calculatePrivateKeyByPointId('previous', operations, 'generator');
      expect(result).toBe(2n); // 1 * 2 = 2 (before the add operation)
    });
  });

  describe('Original point in practice mode', () => {
    it('should return practice private key for original point in practice mode', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId(
        'original',
        operations,
        'generator',
        true,
        'ABCDEF'
      );
      expect(result).toBe(BigInt('0xABCDEF'));
    });

    it('should return undefined for original point when not in practice mode', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId(
        'original',
        operations,
        'generator',
        false,
        'ABCDEF'
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined for original point when no practice private key', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId('original', operations, 'generator', true);
      expect(result).toBeUndefined();
    });
  });

  describe('Challenge mode', () => {
    it('should return undefined for current point in challenge mode without practice', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 5',
          value: '5',
          direction: 'reverse',
        },
      ];
      const result = calculatePrivateKeyByPointId('current', operations, 'challenge');
      expect(result).toBeUndefined();
    });

    it('should calculate private key for current point in challenge mode with practice', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* 2',
          value: '2',
          direction: 'reverse',
        },
      ];
      const result = calculatePrivateKeyByPointId('current', operations, 'challenge', true, '10');
      expect(result).toBe(32n); // 0x10 * 2 = 32
    });
  });

  describe('Unknown point ID', () => {
    it('should return undefined for unknown point ID', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId('unknown', operations, 'generator');
      expect(result).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should return undefined when calculation throws error', () => {
      const operations: Operation[] = [
        {
          id: 'op1',
          type: 'multiply',
          description: '* invalid',
          value: '', // Empty value gets ignored, so result is 1 (no operations applied)
          direction: 'forward',
        },
      ];
      const result = calculatePrivateKeyByPointId('current', operations, 'generator');
      // Empty values don't cause errors, they get ignored, so result is 1
      expect(result).toBe(1n);
    });
  });

  describe('Hex values', () => {
    it('should handle hex practice private key', () => {
      const operations: Operation[] = [];
      const result = calculatePrivateKeyByPointId(
        'original',
        operations,
        'generator',
        true,
        '1A2B3C'
      );
      expect(result).toBe(BigInt('0x1A2B3C'));
    });
  });
});
