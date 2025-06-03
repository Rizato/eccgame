import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import {
  bigintToHex,
  generateRandomScalar,
  getGeneratorPoint,
  pointMultiply,
  pointToPublicKey,
} from '../../utils/ecc';
import type { Challenge } from '../../types/api';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface PracticeModeState {
  practicePrivateKey: string;
  practiceChallenge: Challenge | null;
  difficulty: Difficulty;
  isGenerating: boolean;
}

const initialState: PracticeModeState = {
  practicePrivateKey: '',
  practiceChallenge: null,
  difficulty: 'easy',
  isGenerating: false,
};

export const generatePracticeChallenge = createAsyncThunk(
  'practiceMode/generatePracticeChallenge',
  async (difficulty: Difficulty) => {
    let privateKey: bigint;

    switch (difficulty) {
      case 'easy':
        // Small private key (1-100)
        privateKey = BigInt(Math.floor(Math.random() * 100) + 1);
        break;
      case 'medium':
        // Medium private key (up to 2^20)
        privateKey = BigInt(Math.floor(Math.random() * 1048576) + 1);
        break;
      case 'hard':
        // Large private key (full range)
        privateKey = generateRandomScalar();
        break;
    }

    const privateKeyHex = bigintToHex(privateKey);
    const generatorPoint = getGeneratorPoint();
    const publicKeyPoint = pointMultiply(privateKey, generatorPoint);
    const publicKeyHex = pointToPublicKey(publicKeyPoint);

    // Generate the P2PKH address
    const p2pkhAddress = await getP2PKHAddress(publicKeyHex);

    const challenge: Challenge = {
      uuid: 'practice-challenge',
      public_key: publicKeyHex,
      p2pkh_address: p2pkhAddress,
      created_at: new Date().toISOString(),
      metadata: [
        {
          tag: 'difficulty',
          description: difficulty,
        },
        {
          tag: 'range',
          description: difficulty === 'easy' ? '1-100' : difficulty === 'medium' ? '1-1M' : 'full',
        },
      ],
      explorer_link: '',
      active: true,
      active_date: new Date().toISOString(),
    };

    return {
      privateKey: privateKeyHex,
      challenge,
    };
  }
);

const practiceModeSlice = createSlice({
  name: 'practiceMode',
  initialState,
  reducers: {
    setDifficulty: (state, action: PayloadAction<Difficulty>) => {
      state.difficulty = action.payload;
    },
    setPracticePrivateKey: (state, action: PayloadAction<string>) => {
      state.practicePrivateKey = action.payload;
    },
    setPracticeChallenge: (state, action: PayloadAction<Challenge | null>) => {
      state.practiceChallenge = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(generatePracticeChallenge.pending, state => {
        state.isGenerating = true;
      })
      .addCase(generatePracticeChallenge.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.practicePrivateKey = action.payload.privateKey;
        state.practiceChallenge = action.payload.challenge;
      })
      .addCase(generatePracticeChallenge.rejected, state => {
        state.isGenerating = false;
      });
  },
});

export const { setDifficulty, setPracticePrivateKey, setPracticeChallenge } =
  practiceModeSlice.actions;
export default practiceModeSlice.reducer;
