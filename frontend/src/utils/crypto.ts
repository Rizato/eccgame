/**
 * Utility functions for cryptographic operations
 */

/**
 * Convert a hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
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
 * Parse UUID string to bytes (for signature creation)
 */
export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  return hexToBytes(hex);
}

/**
 * Validate public key format (basic hex validation)
 */
export function isValidPublicKey(publicKey: string): boolean {
  // Basic validation: should be hex string
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(publicKey)) {
    return false;
  }

  // Common public key lengths (compressed: 66 chars, uncompressed: 130 chars)
  const length = publicKey.length;
  return length === 66 || length === 130;
}

/**
 * Validate signature format (basic hex validation)
 */
export function isValidSignature(signature: string): boolean {
  // Should be hex string of specific length (typically 128 characters for DER format)
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(signature) && signature.length >= 64 && signature.length <= 144;
}
