import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { createSignature } from '../../utils/crypto';
import { calculateChallengePrivateKeyFromGraph } from '../../utils/graphOperations';
import { bigintToHex } from '../../utils/ecc';
import type { Challenge } from '../../types/game';
import type { PointGraph } from '../../types/ecc';
import type { AppThunk } from '../index';

// Comprehensive thunk for handling victory logic
export const handleVictory = createAsyncThunk(
  'gameManagement/handleVictory',
  async (
    {
      challenge,
      graph,
      isPracticeMode = false,
    }: {
      challenge: Challenge;
      graph: PointGraph;
      isPracticeMode?: boolean;
    },
    { dispatch }
  ) => {
    try {
      // Calculate private key from graph
      const privateKeyBigInt = calculateChallengePrivateKeyFromGraph(challenge, graph);

      if (privateKeyBigInt === undefined) {
        throw new Error('Could not calculate private key from graph');
      }

      const privateKeyHex = bigintToHex(privateKeyBigInt);

      // Create signature
      const signature = await createSignature(privateKeyHex);

      return {
        privateKey: privateKeyHex,
        signature,
        isPracticeMode,
      };
    } catch (error) {
      throw new Error(
        `Victory handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
);

// Thunk for giving up
export const giveUp = (): AppThunk => {
  return (dispatch, getState) => {
    const state = getState();
    const gameMode = state.game.gameMode;
    const challenge =
      gameMode === 'practice'
        ? ({
            id: state.practiceMode.challengeId,
            p2pkh_address: state.practiceMode.challengeAddress,
            public_key: state.practiceMode.challengePublicKey,
            tags: state.practiceMode.challengeTags,
          } as Challenge)
        : state.game.challenge;

    if (!challenge) return;

    const graph =
      gameMode === 'practice' ? state.practiceCalculator.graph : state.dailyCalculator.graph;

    // Handle victory with gave up flag
    dispatch(
      handleVictory({
        challenge,
        graph,
        isPracticeMode: gameMode === 'practice',
      })
    );

    // Set gave up state
    dispatch({ type: 'game/setGaveUp', payload: true });
  };
};

interface GameManagementState {
  isProcessingVictory: boolean;
  victoryError: string | null;
}

const initialState: GameManagementState = {
  isProcessingVictory: false,
  victoryError: null,
};

const gameManagementSlice = createSlice({
  name: 'gameManagement',
  initialState,
  reducers: {
    clearVictoryError: state => {
      state.victoryError = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(handleVictory.pending, state => {
        state.isProcessingVictory = true;
        state.victoryError = null;
      })
      .addCase(handleVictory.fulfilled, (state, action) => {
        state.isProcessingVictory = false;
        // Victory data is handled by the individual mode slices through additional actions
      })
      .addCase(handleVictory.rejected, (state, action) => {
        state.isProcessingVictory = false;
        state.victoryError = action.error.message || 'Victory processing failed';
      });
  },
});

export const { clearVictoryError } = gameManagementSlice.actions;
export default gameManagementSlice.reducer;

// Selectors
export const selectIsProcessingVictory = (state: { gameManagement: GameManagementState }) =>
  state.gameManagement.isProcessingVictory;
export const selectVictoryError = (state: { gameManagement: GameManagementState }) =>
  state.gameManagement.victoryError;
