import { describe, it, expect } from 'vitest';
import { hexToBytes, bytesToHex, isValidPublicKey, isValidSignature } from './crypto';

describe('crypto utilities', () => {
  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const result = hexToBytes('48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should throw error for invalid hex string', () => {
      expect(() => hexToBytes('invalid')).toThrow('Invalid hex string');
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToHex(bytes);
      expect(result).toBe('48656c6c6f');
    });
  });

  describe('isValidPublicKey', () => {
    it('should validate compressed public key (66 chars)', () => {
      const compressedKey = '02' + '0'.repeat(64);
      expect(isValidPublicKey(compressedKey)).toBe(true);
    });

    it('should validate uncompressed public key (130 chars)', () => {
      const uncompressedKey = '04' + '0'.repeat(128);
      expect(isValidPublicKey(uncompressedKey)).toBe(true);
    });

    it('should reject invalid length', () => {
      expect(isValidPublicKey('1234')).toBe(false);
    });

    it('should reject non-hex characters', () => {
      expect(isValidPublicKey('g'.repeat(66))).toBe(false);
    });
  });

  describe('isValidSignature', () => {
    it('should validate proper signature length', () => {
      const signature = '0'.repeat(128);
      expect(isValidSignature(signature)).toBe(true);
    });

    it('should reject too short signature', () => {
      expect(isValidSignature('1234')).toBe(false);
    });

    it('should reject non-hex characters', () => {
      expect(isValidSignature('g'.repeat(128))).toBe(false);
    });
  });
});
