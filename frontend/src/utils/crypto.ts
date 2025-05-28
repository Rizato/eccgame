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
 * Convert compressed public key to uncompressed format
 */
export function getUncompressedPublicKey(compressedHex: string): string {
  try {
    const compressedBytes = hexToBytes(compressedHex);
    const uncompressedBytes = secp256k1.publicKeyConvert(compressedBytes, false);
    return bytesToHex(uncompressedBytes);
  } catch {
    throw new Error('Invalid compressed public key');
  }
}

/**
 * Extract x and y coordinates from uncompressed public key
 */
export function getPublicKeyCoordinates(publicKeyHex: string): { x: string; y: string } {
  try {
    let uncompressedHex = publicKeyHex;

    // If it's compressed, convert to uncompressed first
    if (
      publicKeyHex.length === 66 &&
      (publicKeyHex.startsWith('02') || publicKeyHex.startsWith('03'))
    ) {
      uncompressedHex = getUncompressedPublicKey(publicKeyHex);
    }

    // Uncompressed key format: 04 + 32 bytes x + 32 bytes y
    if (uncompressedHex.length !== 130 || !uncompressedHex.startsWith('04')) {
      throw new Error('Invalid uncompressed public key format');
    }

    const x = uncompressedHex.slice(2, 66); // First 32 bytes (64 hex chars)
    const y = uncompressedHex.slice(66, 130); // Second 32 bytes (64 hex chars)

    return { x, y };
  } catch {
    throw new Error('Unable to extract coordinates from public key');
  }
}

/**
 * Generate P2PKH address from public key (simplified version)
 * Note: This is a simplified implementation for display purposes
 */
export async function getP2PKHAddress(publicKeyHex: string): Promise<string> {
  try {
    let compressed = publicKeyHex;

    // If input is uncompressed, convert to compressed
    if (publicKeyHex.length === 130 && publicKeyHex.startsWith('04')) {
      const uncompressedBytes = hexToBytes(publicKeyHex);
      const compressedBytes = secp256k1.publicKeyConvert(uncompressedBytes, true);
      compressed = bytesToHex(compressedBytes);
    }

    const pubKeyBytes = hexToBytes(compressed);

    // SHA256 hash of the public key
    const sha256Hash = await crypto.subtle.digest('SHA-256', pubKeyBytes);

    // RIPEMD160 would be needed for real Bitcoin addresses, but we'll use a simplified approach
    // Since we don't have RIPEMD160 in browsers, we'll just return a mock address format
    // In a real implementation, you'd need a proper Bitcoin address library
    const sha256Bytes = new Uint8Array(sha256Hash);
    const addressHash = bytesToHex(sha256Bytes.slice(0, 20)); // Take first 20 bytes

    return `1${addressHash.slice(0, 30)}`; // Mock P2PKH format
  } catch {
    throw new Error('Unable to generate P2PKH address');
  }
}

/**
 * Get all public key formats (compressed, uncompressed, coordinates, p2pkh)
 */
export async function getAllKeyFormats(publicKeyHex: string): Promise<{
  compressed: string;
  uncompressed: string;
  coordinates: { x: string; y: string };
  p2pkh: string;
}> {
  try {
    let compressed = publicKeyHex;

    // If input is uncompressed, convert to compressed
    if (publicKeyHex.length === 130 && publicKeyHex.startsWith('04')) {
      const uncompressedBytes = hexToBytes(publicKeyHex);
      const compressedBytes = secp256k1.publicKeyConvert(uncompressedBytes, true);
      compressed = bytesToHex(compressedBytes);
    }

    const uncompressed = getUncompressedPublicKey(compressed);
    const coordinates = getPublicKeyCoordinates(uncompressed);
    const p2pkh = await getP2PKHAddress(compressed);

    return {
      compressed,
      uncompressed,
      coordinates,
      p2pkh,
    };
  } catch {
    throw new Error('Invalid public key format');
  }
}

/**
 * Get all public key formats (compressed, uncompressed, coordinates) - synchronous version
 */
export function getPublicKeyFormats(publicKeyHex: string): {
  compressed: string;
  uncompressed: string;
  coordinates: { x: string; y: string };
} {
  try {
    let compressed = publicKeyHex;

    // If input is uncompressed, convert to compressed
    if (publicKeyHex.length === 130 && publicKeyHex.startsWith('04')) {
      const uncompressedBytes = hexToBytes(publicKeyHex);
      const compressedBytes = secp256k1.publicKeyConvert(uncompressedBytes, true);
      compressed = bytesToHex(compressedBytes);
    }

    const uncompressed = getUncompressedPublicKey(compressed);
    const coordinates = getPublicKeyCoordinates(uncompressed);

    return {
      compressed,
      uncompressed,
      coordinates,
    };
  } catch {
    throw new Error('Invalid public key format');
  }
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
