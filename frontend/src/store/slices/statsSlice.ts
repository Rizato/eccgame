import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { storageUtils } from '../../utils/storage';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalOperations: number;
  averageOperations: number;
  bestOperations: number | null;
  currentStreak: number;
  maxStreak: number;
  dailyGamesPlayed: number;
  operationHistory: number[]; // Last 20 games for histogram
  playedChallenges: string[]; // Track which challenge IDs have been played
}

interface StatsState {
  stats: GameStats;
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalOperations: 0,
  averageOperations: 0,
  bestOperations: null,
  currentStreak: 0,
  maxStreak: 0,
  dailyGamesPlayed: 0,
  operationHistory: [],
  playedChallenges: [],
};

// Load stats with migration for old data
const loadInitialStats = (): GameStats => {
  const savedStats = storageUtils.getGameStats();
  if (!savedStats) return defaultStats;

  // Migrate old stats that don't have playedChallenges
  return {
    ...savedStats,
    playedChallenges: savedStats.playedChallenges || [],
  };
};

const initialState: StatsState = {
  stats: loadInitialStats(),
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    recordGamePlayed: (
      state,
      action: PayloadAction<{ mode: 'daily' | 'practice'; challengeId?: string }>
    ) => {
      const { mode, challengeId } = action.payload;

      // Ensure playedChallenges exists (for migration)
      if (!state.stats.playedChallenges) {
        state.stats.playedChallenges = [];
      }

      // Only track daily challenges, not practice mode
      if (mode === 'daily' && challengeId) {
        if (state.stats.playedChallenges.includes(challengeId)) {
          return; // Already played this challenge
        }
        state.stats.playedChallenges.push(challengeId);
        state.stats.dailyGamesPlayed += 1;
        state.stats.gamesPlayed += 1;
        storageUtils.saveGameStats(state.stats);
      }
      // Don't track practice mode stats
    },

    recordGameWon: (
      state,
      action: PayloadAction<{ operations: number; mode: 'daily' | 'practice' }>
    ) => {
      const { operations, mode } = action.payload;
      if (mode === 'practice') {
        return;
      }
      state.stats.gamesWon += 1;
      state.stats.totalOperations += operations;
      state.stats.averageOperations = state.stats.totalOperations / state.stats.gamesWon;

      if (state.stats.bestOperations === null || operations < state.stats.bestOperations) {
        state.stats.bestOperations = operations;
      }

      state.stats.currentStreak += 1;
      if (state.stats.currentStreak > state.stats.maxStreak) {
        state.stats.maxStreak = state.stats.currentStreak;
      }

      // Add to operation history (keep last 20)
      state.stats.operationHistory.push(operations);
      if (state.stats.operationHistory.length > 20) {
        state.stats.operationHistory.shift();
      }

      storageUtils.saveGameStats(state.stats);
    },

    recordGameLost: state => {
      state.stats.currentStreak = 0;
      storageUtils.saveGameStats(state.stats);
    },

    resetStats: state => {
      state.stats = { ...defaultStats };
      storageUtils.clearGameStats();
    },

    loadStats: state => {
      const savedStats = storageUtils.getGameStats();
      if (savedStats) {
        // Migrate old stats that don't have playedChallenges
        state.stats = {
          ...savedStats,
          playedChallenges: savedStats.playedChallenges || [],
        };
      }
    },
  },
});

export const { recordGamePlayed, recordGameWon, recordGameLost, resetStats, loadStats } =
  statsSlice.actions;
export default statsSlice.reducer;
