import type { GameStats } from '../store/slices/statsSlice';

const STORAGE_PREFIX = 'ecccryptoplayground_';
const DAILY_WINS_KEY = `${STORAGE_PREFIX}daily_wins`;
const ADDRESS_WINS_KEY = `${STORAGE_PREFIX}address_wins`;
const GAMES_STARTED_KEY = `${STORAGE_PREFIX}games_started`;
const FIRST_VISIT_KEY = `${STORAGE_PREFIX}first_visit_complete`;
const GAME_STATS_KEY = `${STORAGE_PREFIX}game_stats`;

export const storageUtils = {
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

  // Address-based win tracking (persistent across refreshes)
  markWonByAddress: (address: string): void => {
    try {
      const stored = localStorage.getItem(ADDRESS_WINS_KEY);
      const addressWins = stored ? JSON.parse(stored) : {};

      const today = new Date().toDateString();
      addressWins[address] = { date: today, timestamp: Date.now() };

      localStorage.setItem(ADDRESS_WINS_KEY, JSON.stringify(addressWins));
    } catch (error) {
      console.warn('Failed to mark address win:', error);
    }
  },

  hasWonByAddress: (address: string): boolean => {
    try {
      const stored = localStorage.getItem(ADDRESS_WINS_KEY);
      if (!stored) return false;

      const addressWins = JSON.parse(stored);
      return !!addressWins[address];
    } catch (error) {
      console.warn('Failed to check address win status:', error);
      return false;
    }
  },

  // Check if this is the first win for an address (for stats counting)
  isFirstWinForAddress: (address: string): boolean => {
    return !storageUtils.hasWonByAddress(address);
  },

  // Game started tracking (to count games played on first operation)
  markGameStarted: (challengeUuid: string): void => {
    try {
      const stored = localStorage.getItem(GAMES_STARTED_KEY);
      const gamesStarted = stored ? JSON.parse(stored) : {};

      const today = new Date().toDateString();
      gamesStarted[challengeUuid] = { date: today, timestamp: Date.now() };

      localStorage.setItem(GAMES_STARTED_KEY, JSON.stringify(gamesStarted));
    } catch (error) {
      console.warn('Failed to mark game started:', error);
    }
  },

  hasGameStarted: (challengeUuid: string): boolean => {
    try {
      const stored = localStorage.getItem(GAMES_STARTED_KEY);
      if (!stored) return false;

      const gamesStarted = JSON.parse(stored);
      return !!gamesStarted[challengeUuid];
    } catch (error) {
      console.warn('Failed to check game started status:', error);
      return false;
    }
  },

  // First visit tracking
  isFirstVisit: (): boolean => {
    try {
      const completed = localStorage.getItem(FIRST_VISIT_KEY);
      return !completed;
    } catch (error) {
      console.warn('Failed to check first visit status:', error);
      return false;
    }
  },

  markFirstVisitComplete: (): void => {
    try {
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    } catch (error) {
      console.warn('Failed to mark first visit complete:', error);
    }
  },

  // Game stats tracking
  getGameStats: (): GameStats | null => {
    try {
      const stored = localStorage.getItem(GAME_STATS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get game stats:', error);
      return null;
    }
  },

  saveGameStats: (stats: GameStats): void => {
    try {
      localStorage.setItem(GAME_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to save game stats:', error);
    }
  },

  clearGameStats: (): void => {
    try {
      localStorage.removeItem(GAME_STATS_KEY);
    } catch (error) {
      console.warn('Failed to clear game stats:', error);
    }
  },
};
