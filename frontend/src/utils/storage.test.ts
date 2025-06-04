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

  describe('saveGuessHistory', () => {
    it('should save guess history for a challenge', () => {
      const guesses = [mockGuess];

      storageUtils.saveGuessHistory(challengeUuid, guesses);

      const stored = JSON.parse(mockLocalStorage.getItem('cryptoguesser_guess_history') || '{}');
      expect(stored[challengeUuid]).toEqual(guesses);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => storageUtils.saveGuessHistory(challengeUuid, [mockGuess])).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save guess history to localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('loadGuessHistory', () => {
    it('should load guess history for a challenge', () => {
      const guesses = [mockGuess];
      storageUtils.saveGuessHistory(challengeUuid, guesses);

      const loaded = storageUtils.loadGuessHistory(challengeUuid);

      expect(loaded).toEqual(guesses);
    });

    it('should return empty array for non-existent challenge', () => {
      const loaded = storageUtils.loadGuessHistory('non-existent');

      expect(loaded).toEqual([]);
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(mockLocalStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = storageUtils.loadGuessHistory(challengeUuid);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load guess history from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('getAllGuessHistory', () => {
    it('should return all guess history', () => {
      const guesses1 = [mockGuess];
      const guesses2 = [{ ...mockGuess, uuid: 'guess-456' }];

      storageUtils.saveGuessHistory('challenge-1', guesses1);
      storageUtils.saveGuessHistory('challenge-2', guesses2);

      const allHistory = storageUtils.getAllGuessHistory();

      expect(allHistory).toEqual({
        'challenge-1': guesses1,
        'challenge-2': guesses2,
      });
    });

    it('should return empty object when no history exists', () => {
      const allHistory = storageUtils.getAllGuessHistory();

      expect(allHistory).toEqual({});
    });

    it('should handle corrupted JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockLocalStorage.setItem('cryptoguesser_guess_history', 'invalid json');

      const result = storageUtils.getAllGuessHistory();

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse guess history from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('addGuess', () => {
    it('should add a new guess to existing history', () => {
      const existingGuess = { ...mockGuess, uuid: 'existing-guess' };
      const newGuess = { ...mockGuess, uuid: 'new-guess' };

      storageUtils.saveGuessHistory(challengeUuid, [existingGuess]);
      storageUtils.addGuess(challengeUuid, newGuess);

      const history = storageUtils.loadGuessHistory(challengeUuid);

      expect(history).toEqual([newGuess, existingGuess]);
    });

    it('should add guess to empty history', () => {
      storageUtils.addGuess(challengeUuid, mockGuess);

      const history = storageUtils.loadGuessHistory(challengeUuid);

      expect(history).toEqual([mockGuess]);
    });
  });

  describe('clearChallengeHistory', () => {
    it('should clear history for specific challenge', () => {
      storageUtils.saveGuessHistory('challenge-1', [mockGuess]);
      storageUtils.saveGuessHistory('challenge-2', [mockGuess]);

      storageUtils.clearChallengeHistory('challenge-1');

      const allHistory = storageUtils.getAllGuessHistory();
      expect(allHistory).toEqual({
        'challenge-2': [mockGuess],
      });
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageUtils.clearChallengeHistory(challengeUuid)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear challenge history:',
        expect.any(Error)
      );
    });
  });

  describe('clearAllHistory', () => {
    it('should clear all history', () => {
      storageUtils.saveGuessHistory(challengeUuid, [mockGuess]);

      storageUtils.clearAllHistory();

      const allHistory = storageUtils.getAllGuessHistory();
      expect(allHistory).toEqual({});
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(mockLocalStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => storageUtils.clearAllHistory()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear all history:', expect.any(Error));
    });
  });

  describe('getStorageStats', () => {
    it('should return correct storage statistics', () => {
      const guesses1 = [mockGuess, { ...mockGuess, uuid: 'guess-2' }];
      const guesses2 = [{ ...mockGuess, uuid: 'guess-3' }];

      storageUtils.saveGuessHistory('challenge-1', guesses1);
      storageUtils.saveGuessHistory('challenge-2', guesses2);

      const stats = storageUtils.getStorageStats();

      expect(stats.challengeCount).toBe(2);
      expect(stats.totalGuesses).toBe(3);
      expect(stats.storageSize).toBeGreaterThan(0);
      expect(typeof stats.storageSize).toBe('number');
    });

    it('should return zero stats for empty storage', () => {
      const stats = storageUtils.getStorageStats();

      expect(stats.challengeCount).toBe(0);
      expect(stats.totalGuesses).toBe(0);
      expect(stats.storageSize).toBe(2); // "{}" JSON string length
    });
  });
});
