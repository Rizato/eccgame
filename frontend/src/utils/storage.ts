import type { SavedPoint } from './ecc';
import type { GuessResponse } from '../types/api';

const STORAGE_PREFIX = 'cryptoguesser_';
const GUESS_HISTORY_KEY = `${STORAGE_PREFIX}guess_history`;
const DAILY_WINS_KEY = `${STORAGE_PREFIX}daily_wins`;
const SAVED_POINTS_KEY = `${STORAGE_PREFIX}saved_points`;

interface GuessHistoryStorage {
  [challengeUuid: string]: GuessResponse[];
}

export const storageUtils = {
  // Save guess history for a specific challenge
  saveGuessHistory: (challengeUuid: string, guesses: GuessResponse[]): void => {
    try {
      const existingHistory = storageUtils.getAllGuessHistory();
      existingHistory[challengeUuid] = guesses;
      localStorage.setItem(GUESS_HISTORY_KEY, JSON.stringify(existingHistory));
    } catch (error) {
      console.warn('Failed to save guess history to localStorage:', error);
    }
  },

  // Load guess history for a specific challenge
  loadGuessHistory: (challengeUuid: string): GuessResponse[] => {
    try {
      const allHistory = storageUtils.getAllGuessHistory();
      return allHistory[challengeUuid] || [];
    } catch (error) {
      console.warn('Failed to load guess history from localStorage:', error);
      return [];
    }
  },

  // Get all guess history across all challenges
  getAllGuessHistory: (): GuessHistoryStorage => {
    try {
      const stored = localStorage.getItem(GUESS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to parse guess history from localStorage:', error);
      return {};
    }
  },

  // Add a new guess to the history for a challenge
  addGuess: (challengeUuid: string, guess: GuessResponse): void => {
    const existingGuesses = storageUtils.loadGuessHistory(challengeUuid);
    const updatedGuesses = [guess, ...existingGuesses];
    storageUtils.saveGuessHistory(challengeUuid, updatedGuesses);
  },

  // Clear history for a specific challenge
  clearChallengeHistory: (challengeUuid: string): void => {
    try {
      const allHistory = storageUtils.getAllGuessHistory();
      delete allHistory[challengeUuid];
      localStorage.setItem(GUESS_HISTORY_KEY, JSON.stringify(allHistory));
    } catch (error) {
      console.warn('Failed to clear challenge history:', error);
    }
  },

  // Clear all guess history
  clearAllHistory: (): void => {
    try {
      localStorage.removeItem(GUESS_HISTORY_KEY);
    } catch (error) {
      console.warn('Failed to clear all history:', error);
    }
  },

  // Get storage statistics
  getStorageStats: () => {
    const allHistory = storageUtils.getAllGuessHistory();
    const challengeCount = Object.keys(allHistory).length;
    const totalGuesses = Object.values(allHistory).reduce(
      (sum, guesses) => sum + guesses.length,
      0
    );

    return {
      challengeCount,
      totalGuesses,
      storageSize: JSON.stringify(allHistory).length,
    };
  },

  // Daily challenge win tracking
  markWonToday: (challengeUuid: string): void => {
    try {
      const today = new Date().toDateString();
      const winData = { challengeUuid, date: today };
      localStorage.setItem(DAILY_WINS_KEY, JSON.stringify(winData));
    } catch (error) {
      console.warn('Failed to mark daily win:', error);
    }
  },

  hasWonToday: (challengeUuid: string): boolean => {
    try {
      const stored = localStorage.getItem(DAILY_WINS_KEY);
      if (!stored) return false;

      const winData = JSON.parse(stored);
      const today = new Date().toDateString();

      return winData.challengeUuid === challengeUuid && winData.date === today;
    } catch (error) {
      console.warn('Failed to check daily win status:', error);
      return false;
    }
  },

  // Saved points management
  saveSavedPoints: (points: SavedPoint[]): void => {
    try {
      localStorage.setItem(SAVED_POINTS_KEY, JSON.stringify(points));
    } catch (error) {
      console.warn('Failed to save points:', error);
    }
  },

  loadSavedPoints: (): SavedPoint[] => {
    try {
      const stored = localStorage.getItem(SAVED_POINTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load saved points:', error);
      return [];
    }
  },

  clearSavedPoints: (): void => {
    try {
      localStorage.removeItem(SAVED_POINTS_KEY);
    } catch (error) {
      console.warn('Failed to clear saved points:', error);
    }
  },
};
