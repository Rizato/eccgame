import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';

// Polyfill Web Crypto API for Node.js test environment
const crypto = new Crypto();
Object.defineProperty(globalThis, 'crypto', {
  value: crypto,
});
