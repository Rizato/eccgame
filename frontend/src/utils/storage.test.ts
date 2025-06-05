import { beforeEach, describe, expect, it, vi } from 'vitest';
import { storageUtils } from './storage';
import type { GuessResponse } from '../types/api';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockGuess: GuessResponse = {
  uuid: 'guess-123',
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  signature:
    '304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  result: 'incorrect',
  is_key_valid: true,
  is_signature_valid: true,
  validated_at: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  challenge: 'challenge-123',
};

const challengeUuid = 'challenge-123';

describe('storageUtils', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });
});
