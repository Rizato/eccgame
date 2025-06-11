import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { challenges } from '../../data/challenges.json';
import type { Challenge } from '../../types/game';
import type { AppThunk } from '../index.ts';

export type GameMode = 'daily' | 'practice';

interface GameState {
  gameMode: GameMode;
  challenge: Challenge | null;
  loading: boolean;
  error: string | null;
  hasWon: boolean;
  gaveUp: boolean;
  challenges: Challenge[];
}

const initialState: GameState = {
  gameMode: 'daily',
  challenge: null,
  loading: true,
  error: null,
  hasWon: false,
  gaveUp: false,
  challenges: challenges,
};

export const loadDailyChallenge = (): AppThunk => {
  return (dispatch, getState) => {
    const now = new Date();
    const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
    const state = getState() as { game: GameState };
    const challenges = state.game.challenges;
    const challengeIndex = daysSinceEpoch % challenges.length;
    const challenge = {
      id: challengeIndex,
      ...challenges[challengeIndex],
    };
    dispatch(setChallenge(challenge));
  };
};

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
        state.gaveUp = false;
        state.loading = false;
        state.error = null;
      }
    },
    setChallenge: (state, action: PayloadAction<Challenge | null>) => {
      state.loading = false;
      state.challenge = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setHasWon: (state, action: PayloadAction<boolean>) => {
      state.hasWon = action.payload;
    },
    setGaveUp: (state, action: PayloadAction<boolean>) => {
      state.gaveUp = action.payload;
    },
    clearError: state => {
      state.error = null;
    },
    setChallenges: (state, action: PayloadAction<Challenge[]>) => {
      state.challenges = action.payload;
    },
  },
});

export const {
  setGameMode,
  setChallenge,
  setError,
  setHasWon,
  setGaveUp,
  clearError,
  setChallenges,
} = gameSlice.actions;
export default gameSlice.reducer;
