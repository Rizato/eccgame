import { ec as EC } from 'elliptic';
import { describe, expect, it } from 'vitest';
import { generateRandomScalar, getGeneratorPoint, pointMultiply, pointToPublicKey } from './ecc';

const ec = new EC('secp256k1');

describe('Practice Mode Private Key Generation', () => {
  it('should generate correct public keys for easy difficulty range', () => {
    // Test multiple private keys in the easy range (2-100)
    const testKeys = [2n, 10n, 50n, 75n, 100n];

    for (const privateKey of testKeys) {
      // Our implementation
      const publicKeyPoint = pointMultiply(privateKey, getGeneratorPoint());
      const publicKeyHex = pointToPublicKey(publicKeyPoint);

      // Verify with elliptic.js
      const ecResult = ec.g.mul(privateKey.toString(16));
      const ecPublicKey = ecResult.encodeCompressed('hex');

      expect(publicKeyHex).toBe(ecPublicKey);
      console.log(`Private key ${privateKey}: ✓`);
    }
  });

  it('should generate correct public keys for medium difficulty range', () => {
    // Test multiple private keys in the medium range (up to 2^20)
    const testKeys = [1000n, 10000n, 100000n, 500000n, 1048576n];

    for (const privateKey of testKeys) {
      // Our implementation
      const publicKeyPoint = pointMultiply(privateKey, getGeneratorPoint());
      const publicKeyHex = pointToPublicKey(publicKeyPoint);

      // Verify with elliptic.js
      const ecResult = ec.g.mul(privateKey.toString(16));
      const ecPublicKey = ecResult.encodeCompressed('hex');

      expect(publicKeyHex).toBe(ecPublicKey);
      console.log(`Private key ${privateKey}: ✓`);
    }
  });

  it('should verify that generated points match their private keys', () => {
    // Generate a few random private keys and verify the points match
    for (let i = 0; i < 5; i++) {
      const privateKey = generateRandomScalar();

      // Generate public key
      const publicKeyPoint = pointMultiply(privateKey, getGeneratorPoint());

      // Verify with elliptic.js
      const ecResult = ec.g.mul(privateKey.toString(16));
      expect(publicKeyPoint.x).toBe(BigInt('0x' + ecResult.getX().toString(16)));
      expect(publicKeyPoint.y).toBe(BigInt('0x' + ecResult.getY().toString(16)));
    }
  });

  it('should handle operations on practice mode points correctly', () => {
    // Test a practice scenario: privateKey = 10
    const practicePrivateKey = 10n;
    const generator = getGeneratorPoint();

    // Generate the challenge point (10G)
    const challengePoint = pointMultiply(practicePrivateKey, generator);

    // Verify it matches elliptic.js
    const ecChallenge = ec.g.mul(practicePrivateKey.toString(16));
    expect(challengePoint.x).toBe(BigInt('0x' + ecChallenge.getX().toString(16)));
    expect(challengePoint.y).toBe(BigInt('0x' + ecChallenge.getY().toString(16)));

    // Now simulate solving it by multiplying G by 10
    const solvedPoint = pointMultiply(10n, generator);

    // They should be exactly equal
    expect(solvedPoint.x).toBe(challengePoint.x);
    expect(solvedPoint.y).toBe(challengePoint.y);
  });
});
