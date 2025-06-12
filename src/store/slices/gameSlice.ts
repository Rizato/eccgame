import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { challenges } from '../../data/challenges.json';
import { getP2PKHAddress } from '../../utils/crypto';
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
} = gameSlice.actions;
export default gameSlice.reducer;
