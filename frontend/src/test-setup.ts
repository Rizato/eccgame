import { Crypto } from '@peculiar/webcrypto';
import '@testing-library/jest-dom';

// Polyfill Web Crypto API for Node.js test environment
const crypto = new Crypto();
Object.defineProperty(globalThis, 'crypto', {
  value: crypto,
});
