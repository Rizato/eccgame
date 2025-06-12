/**
 * ECC Game CRYPTOGRAPHY MODULE - TRANSPARENCY NOTICE
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
 * - generateSolutionFromPrivateKey() only returns public key + signature
 * - No private key data is included in the return value
 * - All intermediate calculations are local to this browser session
 *
 * You can inspect this code to verify these privacy guarantees.
 */
import hash from 'hash.js';
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
 * Convert bytes to Base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encode length as VarInt (Bitcoin's variable length integer format)
 */
function encodeVarInt(length: number): Uint8Array {
  if (length < 0xfd) {
    return new Uint8Array([length]);
  } else if (length <= 0xffff) {
    return new Uint8Array([0xfd, length & 0xff, (length >> 8) & 0xff]);
  } else if (length <= 0xffffffff) {
    return new Uint8Array([
      0xfe,
      length & 0xff,
      (length >> 8) & 0xff,
      (length >> 16) & 0xff,
      (length >> 24) & 0xff,
    ]);
  } else {
    throw new Error('VarInt too large');
  }
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
  const privateKeyBytes = hexToBytes(privateKeyHex.padStart(64, '0'));

  if (!secp256k1.privateKeyVerify(privateKeyBytes)) {
    throw new Error('Invalid private key');
  }

  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, true); // Compressed format
  return bytesToHex(publicKeyBytes);
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
    const uncompressed = secp256k1.publicKeyConvert(hexToBytes(publicKeyHex), false);

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
 * Create Bitcoin-compatible message signature using private key
 * Uses Bitcoin's standard message signing format compatible with bitcoin-cli verifymessage
 */
export async function createSignature(privateKeyHex: string): Promise<string> {
  const privateKeyBytes = hexToBytes(privateKeyHex.padStart(64, '0'));

  if (!secp256k1.privateKeyVerify(privateKeyBytes)) {
    throw new Error('Invalid private key');
  }

  // Generate public key from private key
  const publicKeyBytes = secp256k1.publicKeyCreate(privateKeyBytes, true); // Compressed format

  // Create Bitcoin message signature format
  // Message format: [varint_length("Bitcoin Signed Message:\n")]["Bitcoin Signed Message:\n"][varint_length(message)][message]
  const message = bytesToHex(publicKeyBytes);
  const messageBuffer = new TextEncoder().encode(message);

  // Create the Bitcoin message format components
  const magicString = 'Bitcoin Signed Message:\n';
  const magicBuffer = new TextEncoder().encode(magicString);
  const magicLength = encodeVarInt(magicBuffer.length); // Should be 0x18 (24 bytes)
  const messageLength = encodeVarInt(messageBuffer.length);

  // Combine all components: [magic_length][magic][message_length][message]
  const fullMessage = new Uint8Array(
    magicLength.length + magicBuffer.length + messageLength.length + messageBuffer.length
  );
  let offset = 0;
  fullMessage.set(magicLength, offset);
  offset += magicLength.length;
  fullMessage.set(magicBuffer, offset);
  offset += magicBuffer.length;
  fullMessage.set(messageLength, offset);
  offset += messageLength.length;
  fullMessage.set(messageBuffer, offset);

  // Double SHA256 hash (Bitcoin standard)
  const hash1 = await crypto.subtle.digest('SHA-256', fullMessage);
  const hash2 = await crypto.subtle.digest('SHA-256', hash1);
  const messageHash = new Uint8Array(hash2);

  // Create signature with recovery info
  // Note: secp256k1.ecdsaSign uses RFC 6979 deterministic nonces
  // This means signatures will be identical for the same message+private key
  // This is CORRECT and prevents nonce reuse attacks that could leak private keys
  const signatureObj = secp256k1.ecdsaSign(messageHash, privateKeyBytes);

  // Bitcoin signature format: recovery_id + 27 + signature
  const recoveryFlag = 27 + signatureObj.recid;
  const bitcoinSignature = new Uint8Array(65);
  bitcoinSignature[0] = recoveryFlag;
  bitcoinSignature.set(signatureObj.signature, 1);

  // Return Base64 format for bitcoin-cli verifymessage compatibility
  return bytesToBase64(bitcoinSignature);
}
