import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { challenges } from '../../data/challenges.json';
import { getP2PKHAddress } from '../../utils/crypto';
import {
  loadState as loadDailyState,
  saveState as saveDailyState,
  addMultipleChallenges,
} from './eccCalculatorSlice';
import {
  loadState as loadPracticeState,
  saveState as savePracticeState,
} from './practiceCalculatorSlice';
import type { Challenge, ChallengeData } from '../../types/game';
import type { AppThunk } from '../index.ts';

export type GameMode = 'daily' | 'practice';

interface GameState {
  gameMode: GameMode;
  challenge: Challenge | null;
  loading: boolean;
  error: string | null;
  hasWon: boolean;
  gaveUp: boolean;
  challenges: ChallengeData[];
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

export const switchGameMode = (mode: GameMode): AppThunk => {
  return (dispatch, getState) => {
    const currentState = getState();
    const currentMode = currentState.game.gameMode;

    // Save current mode's state before switching
    if (currentMode === 'daily') {
      dispatch(saveDailyState());
    } else if (currentMode === 'practice') {
      dispatch(savePracticeState());
    }

    // Set the new game mode
    dispatch(setGameMode(mode));

    // Load the new mode's state
    if (mode === 'daily') {
      dispatch(loadDailyState());
      // Load all challenges into the graph when switching to daily mode
      const state = getState() as { game: GameState };
      if (state.game.challenges && state.game.challenges.length > 0) {
        dispatch(addMultipleChallenges(state.game.challenges));
      }
    } else if (mode === 'practice') {
      dispatch(loadPracticeState());
    }
  };
};

export const loadDailyChallenge = (): AppThunk => {
  return async (dispatch, getState) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const state = getState() as { game: GameState };
      const challenges = state.game.challenges;

      // Calculate which challenge to show today
      const now = new Date();
      const startDateStr = import.meta.env.VITE_DAILY_CHALLENGE_START_DATE;
      const startDate = startDateStr ? new Date(startDateStr) : new Date(0);

      const daysSinceStart = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const challengeIndex = daysSinceStart % challenges.length;
      const challengeData = challenges[challengeIndex];

      // Generate the P2PKH address from the compressed public key
      const p2pkh_address = await getP2PKHAddress(challengeData.public_key);

      const challenge: Challenge = {
        id: challengeIndex + 1,
        p2pkh_address,
        public_key: challengeData.public_key,
        tags: challengeData.tags,
      };

      dispatch(setChallenge(challenge));

      // Load all challenges into the graph for multiple win conditions
      if (challenges && challenges.length > 0) {
        dispatch(addMultipleChallenges(challenges));
      }
    } catch (error) {
      console.error('Error loading daily challenge:', error);
      dispatch(setError(error instanceof Error ? error.message : 'Failed to load challenge'));
    } finally {
      dispatch(setLoading(false));
    }
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
    setChallenges: (state, action: PayloadAction<ChallengeData[]>) => {
      state.challenges = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
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
    resetGame: state => {
      state.challenge = null;
      state.hasWon = false;
      state.gaveUp = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setGameMode,
  setChallenge,
  setChallenges,
  setLoading,
  setError,
  setHasWon,
  setGaveUp,
  clearError,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;
