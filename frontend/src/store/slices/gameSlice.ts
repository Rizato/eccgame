import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { challengeApi } from '../../services/api';
import { storageUtils } from '../../utils/storage';
import type { Challenge } from '../../types/api';

export type GameMode = 'daily' | 'practice';

interface GameState {
  gameMode: GameMode;
  challenge: Challenge | null;
  loading: boolean;
  error: string | null;
  hasWon: boolean;
}

const initialState: GameState = {
  gameMode: 'daily',
  challenge: null,
  loading: true,
  error: null,
  hasWon: false,
};

export const loadDailyChallenge = createAsyncThunk(
  'game/loadDailyChallenge',
  async (_, { rejectWithValue }) => {
    try {
      const dailyChallenge = await challengeApi.getDailyChallenge();
      const wonToday = storageUtils.hasWonToday(dailyChallenge.uuid);
      return { challenge: dailyChallenge, hasWon: wonToday };
    } catch (error) {
      console.error('Failed to load daily challenge:', error);
      return rejectWithValue("Failed to load today's challenge. Please try again.");
    }
  }
);

export const handleSolve = createAsyncThunk(
  'game/handleSolve',
  async (privateKey: string, { getState, rejectWithValue }) => {
    const state = getState() as { game: GameState };
    const { challenge } = state.game;

    if (!challenge) {
      return rejectWithValue('No challenge available');
    }

    try {
      // TODO: In a real implementation, this would submit to the backend
      // For now, we'll just mark as won locally
      storageUtils.markWonToday(challenge.uuid);
      return true;
    } catch (error) {
      console.error('Failed to submit solution:', error);
      return rejectWithValue('Failed to submit solution. Please try again.');
    }
  }
);

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameMode: (state, action: PayloadAction<GameMode>) => {
      state.gameMode = action.payload;
      if (action.payload === 'practice') {
        // Clear challenge state when switching to practice
        state.challenge = null;
        state.hasWon = false;
        state.loading = false;
        state.error = null;
      }
    },
    setChallenge: (state, action: PayloadAction<Challenge | null>) => {
      state.challenge = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setHasWon: (state, action: PayloadAction<boolean>) => {
      state.hasWon = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadDailyChallenge.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDailyChallenge.fulfilled, (state, action) => {
        state.loading = false;
        state.challenge = action.payload.challenge;
        state.hasWon = action.payload.hasWon;
      })
      .addCase(loadDailyChallenge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(handleSolve.fulfilled, state => {
        state.hasWon = true;
      })
      .addCase(handleSolve.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { setGameMode, setChallenge, setError, setHasWon, clearError } = gameSlice.actions;
export default gameSlice.reducer;
