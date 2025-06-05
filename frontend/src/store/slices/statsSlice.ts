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
  practiceGamesPlayed: number;
  operationHistory: number[]; // Last 20 games for histogram
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
  practiceGamesPlayed: 0,
  operationHistory: [],
};

const initialState: StatsState = {
  stats: storageUtils.getGameStats() || defaultStats,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {
    recordGamePlayed: (state, action: PayloadAction<{ mode: 'daily' | 'practice' }>) => {
      state.stats.gamesPlayed += 1;
      if (action.payload.mode === 'daily') {
        state.stats.dailyGamesPlayed += 1;
      } else {
        state.stats.practiceGamesPlayed += 1;
      }
      storageUtils.saveGameStats(state.stats);
    },

    recordGameWon: (
      state,
      action: PayloadAction<{ operations: number; mode: 'daily' | 'practice' }>
    ) => {
      const { operations } = action.payload;

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
        state.stats = savedStats;
      }
    },
  },
});

export const { recordGamePlayed, recordGameWon, recordGameLost, resetStats, loadStats } =
  statsSlice.actions;
export default statsSlice.reducer;
