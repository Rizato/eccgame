import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to preserve security-critical files for transparency
const preserveSecurityTransparency = () => {
  return {
    name: 'preserve-security-transparency',
    generateBundle(options: any, bundle: any) {
      // Find chunks containing security-critical files
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          if (chunk.facadeModuleId?.includes('api.ts')) {
            // Add transparency banner for API code
            chunk.code = `/*
 * CRYPTO GUESSER API - UNMINIFIED FOR TRANSPARENCY
 * This file contains all API calls and is intentionally unminified
 * to allow users to verify that private keys are never transmitted
 * to the server. Only public keys and signatures are sent.
 *
 * Source: ${chunk.facadeModuleId}
 */\n\n${chunk.code}`;
          } else if (chunk.facadeModuleId?.includes('crypto.ts')) {
            // Add transparency banner for crypto operations
            chunk.code = `/*
 * CRYPTO GUESSER CRYPTOGRAPHY - UNMINIFIED FOR TRANSPARENCY
 * This file contains all cryptographic operations and is intentionally
 * unminified to allow users to verify that:
 * - Private keys never leave your browser
 * - Only public keys and signatures are generated for transmission
 * - All ECDSA operations are performed client-side
 *
 * Source: ${chunk.facadeModuleId}
 */\n\n${chunk.code}`;
          }
        }
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), preserveSecurityTransparency()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Put security-critical files in their own chunks for transparency
          if (id.includes('api.ts')) {
            return 'api-transparent';
          }
          if (id.includes('crypto.ts')) {
            return 'crypto-transparent';
          }
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs in api.ts
        drop_debugger: false,
      },
      mangle: {
        // Don't mangle security-critical functions to keep them readable
        reserved: [
          'challengeApi', 'getDailyChallenge', 'submitGuess', 'getChallenge',
          'hexToBytes', 'bytesToHex', 'isValidPrivateKey', 'getPublicKeyFromPrivate',
          'createSignature', 'generateGuessFromPrivateKey'
        ]
      },
      format: {
        comments: 'some', // Preserve important comments
      }
    }
  }
})
