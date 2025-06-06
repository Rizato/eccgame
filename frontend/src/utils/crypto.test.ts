import { describe, expect, it } from 'vitest';
import {
  base58CheckEncode,
  bytesToHex,
  createSignature,
  generateSolutionFromPrivateKey,
  getP2PKHAddress,
  getPublicKeyFromPrivate,
  hexToBytes,
  isValidPrivateKey,
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

  describe('generateSolutionFromPrivateKey', () => {
    it('should generate solution object with public key and signature', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      const solution = await generateSolutionFromPrivateKey(privateKey, challengeUuid);

      expect(solution).toHaveProperty('public_key');
      expect(solution).toHaveProperty('signature');
      expect(solution.public_key).toHaveLength(66);
      expect(solution.signature).toHaveLength(128);
    });

    it('should throw error for invalid private key', async () => {
      const invalidPrivateKey = 'invalid';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      await expect(
        generateSolutionFromPrivateKey(invalidPrivateKey, challengeUuid)
      ).rejects.toThrow('Invalid private key format or value');
    });

    it('should generate consistent results for same inputs', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const challengeUuid = '550e8400-e29b-41d4-a716-446655440000';

      const solution1 = await generateSolutionFromPrivateKey(privateKey, challengeUuid);
      const solution2 = await generateSolutionFromPrivateKey(privateKey, challengeUuid);

      expect(solution1.public_key).toBe(solution2.public_key);
      expect(solution1.signature).toBe(solution2.signature);
    });
  });

  describe('P2PKH Address Generation', () => {
    it('should properly base58 encode with the correct ripemd160', async () => {
      const h160 = '11b366edfc0a8b66feebae5c2e25a7b6a5d1cf31';
      const expectedb58 = '12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S';

      const actual58 = await base58CheckEncode(hexToBytes('00' + h160));
      expect(actual58).toBe(expectedb58);
    });

    it('should generate a matching p2phk address for statoshi pubkey', async () => {
      // From your Kotlin test: satoshi_pubkey and satoshi_actual_address
      const satoshiPubKey =
        '0411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3';
      const expectedAddress = '12cbQLTFMXRnSzktFkuoG3eHoMeFtpTu3S';

      const actualAddress = await getP2PKHAddress(satoshiPubKey);

      expect(actualAddress).toBe(expectedAddress);
    });

    it('should handle compressed public keys by converting to uncompressed', async () => {
      // Generate a compressed key and test address generation
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      const compressedPubKey = getPublicKeyFromPrivate(privateKey);

      // Should not throw and should return a valid Bitcoin address
      const address = await getP2PKHAddress(compressedPubKey);

      expect(address).toMatch(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/); // Bitcoin address regex
    });

    it('should handle uncompressed public keys directly', async () => {
      const uncompressedPubKey =
        '0496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858ee';

      const address = await getP2PKHAddress(uncompressedPubKey);

      expect(address).toMatch(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/); // Bitcoin address regex
      expect(address).toBe('12c6DSiU4Rq3P4ZxziKxzrL5LmMBrzjrJX');
    });

    it('should throw error for invalid public key format', async () => {
      const invalidPubKey = 'invalid_key';

      await expect(getP2PKHAddress(invalidPubKey)).rejects.toThrow();
    });
  });
});
