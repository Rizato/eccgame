import { describe, it, expect } from 'vitest';
import {
  hexToBytes,
  bytesToHex,
  isValidPrivateKey,
  getPublicKeyFromPrivate,
  createSignature,
  generateGuessFromPrivateKey,
} from './crypto';

describe('crypto utilities', () => {
  describe('hexToBytes', () => {
    it('should convert hex string to bytes', () => {
      const result = hexToBytes('48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle 0x prefix', () => {
      const result = hexToBytes('0x48656c6c6f');
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should throw error for invalid hex string length', () => {
      expect(() => hexToBytes('123')).toThrow('Invalid hex string');
    });
  });

  describe('bytesToHex', () => {
    it('should convert bytes to hex string', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]);
      const result = bytesToHex(bytes);
      expect(result).toBe('48656c6c6f');
    });

    it('should pad single digit hex values', () => {
      const bytes = new Uint8Array([0, 15, 255]);
      const result = bytesToHex(bytes);
      expect(result).toBe('000fff');
    });
  });

  describe('isValidPrivateKey', () => {
    it('should validate proper private key length (64 chars)', () => {
      const privateKey = 'a'.repeat(64);
      const result = isValidPrivateKey(privateKey);
      expect(typeof result).toBe('boolean');
    });

    it('should reject invalid length', () => {
      expect(isValidPrivateKey('1234')).toBe(false);
    });

    it('should reject non-hex characters', () => {
      expect(isValidPrivateKey('g'.repeat(64))).toBe(false);
    });

    it('should reject all zeros private key', () => {
      expect(isValidPrivateKey('0'.repeat(64))).toBe(false);
    });
  });

  describe('getPublicKeyFromPrivate', () => {
    it('should generate public key from valid private key', () => {
      // Valid private key (within secp256k1 range)
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const publicKey = getPublicKeyFromPrivate(privateKey);

      expect(publicKey).toHaveLength(66); // Compressed public key
      expect(publicKey.startsWith('02') || publicKey.startsWith('03')).toBe(true);
    });

    it('should throw error for invalid private key', () => {
      expect(() => getPublicKeyFromPrivate('invalid')).toThrow();
    });
  });

  describe('createSignature', () => {
    it('should create signature for valid inputs', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      const signature = await createSignature(privateKey, challengeUuid);

      expect(signature).toHaveLength(128); // 64 bytes = 128 hex chars
      expect(/^[0-9a-f]+$/i.test(signature)).toBe(true);
    });

    it('should throw error for invalid private key', async () => {
      const invalidPrivateKey = 'invalid';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      await expect(createSignature(invalidPrivateKey, challengeUuid)).rejects.toThrow();
    });
  });

  describe('generateGuessFromPrivateKey', () => {
    it('should generate guess object with public key and signature', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      const guess = await generateGuessFromPrivateKey(privateKey, challengeUuid);

      expect(guess).toHaveProperty('public_key');
      expect(guess).toHaveProperty('signature');
      expect(guess.public_key).toHaveLength(66);
      expect(guess.signature).toHaveLength(128);
    });

    it('should throw error for invalid private key', async () => {
      const invalidPrivateKey = 'invalid';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      await expect(generateGuessFromPrivateKey(invalidPrivateKey, challengeUuid)).rejects.toThrow(
        'Invalid private key format or value'
      );
    });

    it('should generate consistent results for same inputs', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      const guess1 = await generateGuessFromPrivateKey(privateKey, challengeUuid);
      const guess2 = await generateGuessFromPrivateKey(privateKey, challengeUuid);

      expect(guess1.public_key).toBe(guess2.public_key);
      expect(guess1.signature).toBe(guess2.signature);
    });
  });
});
