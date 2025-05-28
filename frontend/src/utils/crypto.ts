/**
 * CRYPTO GUESSER CRYPTOGRAPHY MODULE - TRANSPARENCY NOTICE
 *
 * This file is intentionally unminified in production builds to allow
 * users to verify the security and privacy of all cryptographic operations.
 *
 * SECURITY VERIFICATION:
 * - All private key operations happen locally in your browser
 * - Private keys are NEVER stored, logged, or transmitted anywhere
 * - Only public keys and signatures are generated for server communication
 * - Uses industry-standard secp256k1 elliptic curve cryptography
 *
 * PRIVACY GUARANTEE:
 * - generateGuessFromPrivateKey() only returns public key + signature
 * - No private key data is included in the return value
 * - All intermediate calculations are local to this browser session
 *
 * You can inspect this code to verify these privacy guarantees.
 */

import * as secp256k1 from 'secp256k1';

/**
 * Utility functions for SECP256k1 cryptographic operations
 * All operations are performed CLIENT-SIDE for maximum security
 */

/**
 * Convert a hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }

  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate private key (must be 256 bits / 32 bytes)
 */
export function isValidPrivateKey(privateKeyHex: string): boolean {
  try {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    if (privateKeyBytes.length !== 32) {
      return false;
    }
    return secp256k1.privateKeyVerify(privateKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Generate public key from private key
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  const privateKeyBytes = hexToBytes(privateKeyHex);

  if (!secp256k1.privateKeyVerify(privateKeyBytes)) {
    throw new Error('Invalid private key');
  }

  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, true); // Compressed format
  return bytesToHex(publicKeyBytes);
}

/**
 * Create signature for challenge UUID using private key
 */
export async function createSignature(
  privateKeyHex: string,
  challengeUuid: string
): Promise<string> {
  const privateKeyBytes = hexToBytes(privateKeyHex);

  if (!secp256k1.privateKeyVerify(privateKeyBytes)) {
    throw new Error('Invalid private key');
  }

  // Generate public key from private key
  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, false); // Uncompressed format

  // Convert UUID to bytes (remove hyphens)
  const uuidBytes = hexToBytes(challengeUuid.replace(/-/g, ''));

  // Create message by concatenating public key + UUID bytes
  const messageBytes = new Uint8Array(publicKeyBytes.length + uuidBytes.length);
  messageBytes.set(publicKeyBytes, 0);
  messageBytes.set(uuidBytes, publicKeyBytes.length);

  // Hash the message to get 32 bytes using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
  const hashBytes = new Uint8Array(hashBuffer);

  // Create signature
  const signature = secp256k1.ecdsaSign(hashBytes, privateKeyBytes);

  return bytesToHex(signature.signature);
}

/**
 * Generate public key and signature from private key for a challenge
 *
 * PRIVACY VERIFICATION: This function takes a private key as input but
 * NEVER includes it in the return value. Only the derived public key
 * and cryptographic signature are returned for transmission.
 */
export async function generateGuessFromPrivateKey(privateKeyHex: string, challengeUuid: string) {
  if (!isValidPrivateKey(privateKeyHex)) {
    throw new Error('Invalid private key format or value');
  }

  const publicKey = getPublicKeyFromPrivate(privateKeyHex);
  const signature = await createSignature(privateKeyHex, challengeUuid);

  /*
   * TRANSPARENCY: Return object only contains public information
   * - public_key: Safe to transmit (derived from private key)
   * - signature: Safe to transmit (cryptographic proof)
   * - privateKeyHex: NOT included in return value
   */
  return {
    public_key: publicKey,
    signature: signature,
  };
}
