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
import hash from 'hash.js';

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
 * Pure JavaScript Base58 encode (matching Kotlin implementation)
 */
export function base58Encode(data: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

  // Convert the input bytes to a BigInt (matching Utils.bigIntegerFromArray)
  let intValue = BigInt('0x' + bytesToHex(data));

  // Perform Base58 encoding (matching Kotlin logic)
  let encoded = '';
  const fiftyEight = 58n;

  while (intValue > 0n) {
    const remainder = intValue % fiftyEight;
    intValue = intValue / fiftyEight;
    encoded = alphabet[Number(remainder)] + encoded; // Prepend (matching insert(0, ...))
  }

  // Encode leading zeros (matching takeWhile logic)
  for (let i = 0; i < data.length && data[i] === 0; i++) {
    encoded = alphabet[0] + encoded; // Prepend '1' for each leading zero
  }

  return encoded;
}

/**
 * Base58Check encode with checksum (matching Kotlin implementation)
 */
export async function base58CheckEncode(data: Uint8Array): Promise<string> {
  // Calculate the checksum (matching calculateChecksum)
  const checksum = await calculateChecksum(data);

  // Combine data and checksum (matching: data + checksum)
  const combined = new Uint8Array(data.length + checksum.length);
  combined.set(data, 0);
  combined.set(checksum, data.length);

  // Perform Base58 encoding (matching base58Encode call)
  return base58Encode(combined);
}

/**
 * Calculate checksum (matching Kotlin calculateChecksum function)
 */
async function calculateChecksum(data: Uint8Array): Promise<Uint8Array> {
  // Double SHA256 (matching Kotlin implementation)
  const hash1 = await crypto.subtle.digest('SHA-256', data);
  const hash2 = await crypto.subtle.digest('SHA-256', hash1);

  // Take the first 4 bytes of the second hash as the checksum
  return new Uint8Array(hash2).slice(0, 4);
}

/**
 * Generate proper Bitcoin P2PKH address from public key
 * Uses uncompressed public key format: SHA256 → RIPEMD160 → Base58Check
 */
export async function getP2PKHAddress(publicKeyHex: string): Promise<string> {
  try {
    let uncompressed = secp256k1.publicKeyConvert(hexToBytes(publicKeyHex), false);

    // Step 1: SHA256 hash of the uncompressed public key
    const sha256Hash = await crypto.subtle.digest('SHA-256', uncompressed);
    const sha256Bytes = new Uint8Array(sha256Hash);
    // Step 2: RIPEMD160 hash of the SHA256 hash
    const ripemd160 = hash.ripemd160().update(sha256Bytes).digest();
    const prefixedHash = new Uint8Array(21);
    prefixedHash.set(ripemd160, 1);
    // Add 00 prefix for mainnet
    const address = await base58CheckEncode(prefixedHash);

    return address;
  } catch (error) {
    throw new Error(`Unable to generate P2PKH address: ${error}`);
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
  // TODO Verify this is correct
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
