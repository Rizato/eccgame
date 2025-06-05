import type { GameStats } from '../store/slices/statsSlice';

const STORAGE_PREFIX = 'ecccryptoplayground_';
const DAILY_WINS_KEY = `${STORAGE_PREFIX}daily_wins`;
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
