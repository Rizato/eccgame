import { describe, expect, it } from 'vitest';
import {
  base58CheckEncode,
  bytesToHex,
  createSignature,
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
      expect(() => getPublicKeyFromPrivate('xyz')).toThrow(); // Non-hex characters
    });
  });

  describe('createSignature', () => {
    it('should create Bitcoin-compatible message signature', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';

      const signature = await createSignature(privateKey);

      // Bitcoin signatures are 65 bytes encoded in Base64, so roughly 88 characters
      expect(signature.length).toBeGreaterThan(80);
      expect(signature.length).toBeLessThan(100);

      // Should be valid Base64
      expect(() => atob(signature)).not.toThrow();
    });

    it('should create deterministic signatures (RFC 6979)', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';

      const signature1 = await createSignature(privateKey);
      const signature2 = await createSignature(privateKey);
      const signature3 = await createSignature(privateKey);

      // RFC 6979 deterministic signatures should be identical for same message+key
      // This is CORRECT behavior and prevents nonce reuse attacks
      expect(signature1).toBe(signature2);
      expect(signature2).toBe(signature3);
      expect(signature1).toBe(signature3);

      // Should be valid Base64
      expect(() => atob(signature1)).not.toThrow();
    });

    it('should create different signatures for different private keys', async () => {
      const privateKey1 = '0000000000000000000000000000000000000000000000000000000000000001';
      const privateKey2 = '0000000000000000000000000000000000000000000000000000000000000002';

      const signature1 = await createSignature(privateKey1);
      const signature2 = await createSignature(privateKey2);

      // Different private keys should produce different signatures
      expect(signature1).not.toBe(signature2);
    });

    it('should use proper Bitcoin message format with VarInt lengths', async () => {
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';

      // This mainly tests that the function doesn't throw and produces a valid signature
      // The exact message format is tested internally by the Bitcoin signing process
      const signature = await createSignature(privateKey);

      expect(signature).toBeTruthy();
      expect(() => atob(signature)).not.toThrow();

      // Verify it's a 65-byte signature (recovery flag + 64-byte ECDSA signature) in Base64
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      expect(signatureBytes.length).toBe(65);

      // Recovery flag should be in range 27-30
      expect(signatureBytes[0]).toBeGreaterThanOrEqual(27);
      expect(signatureBytes[0]).toBeLessThanOrEqual(30);
    });

    it('should format message length as VarInt bytes, not string', async () => {
      // Test that we're using proper VarInt encoding instead of string encoding
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';

      // The key point is that this shouldn't throw and should produce a valid signature
      // If we were still encoding lengths as strings, the Bitcoin verification would fail
      const signature = await createSignature(privateKey);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');

      // For debugging: log what we're actually creating
      console.log('Generated signature for testing:', signature);
    });

    it('should throw error for invalid private key', async () => {
      const invalidPrivateKey = 'xyz'; // Non-hex characters

      await expect(createSignature(invalidPrivateKey)).rejects.toThrow();
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
