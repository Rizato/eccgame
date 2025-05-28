import * as secp256k1 from 'secp256k1';

/**
 * Utility functions for SECP256k1 cryptographic operations
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
 */
export async function generateGuessFromPrivateKey(privateKeyHex: string, challengeUuid: string) {
  if (!isValidPrivateKey(privateKeyHex)) {
    throw new Error('Invalid private key format or value');
  }

  const publicKey = getPublicKeyFromPrivate(privateKeyHex);
  const signature = await createSignature(privateKeyHex, challengeUuid);

  return {
    public_key: publicKey,
    signature: signature,
  };
}
