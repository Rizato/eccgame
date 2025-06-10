import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import {
  bigintToHex,
  generateRandomScalar,
  getGeneratorPoint,
  pointMultiply,
  pointToPublicKey,
} from '../../utils/ecc';
import type { Challenge } from '../../types/game';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface PracticeModeState {
  practicePrivateKey: string;
  // Flattened challenge properties
  challengeId: number | null;
  challengeAddress: string;
  challengePublicKey: string;
  challengeTags: string[];
  difficulty: Difficulty;
  isGenerating: boolean;
}

const initialState: PracticeModeState = {
  practicePrivateKey: '',
  challengeId: null,
  challengeAddress: '',
  challengePublicKey: '',
  challengeTags: [],
  difficulty: 'easy',
  isGenerating: false,
};

export const generatePracticeChallenge = createAsyncThunk(
  'practiceMode/generatePracticeChallenge',
  async (difficulty: Difficulty) => {
    let privateKey: bigint;

    switch (difficulty) {
      case 'easy':
        // Small private key (2-100)
        privateKey = BigInt(Math.floor(Math.random() * 100) + 2);
        break;
      case 'medium':
        // Medium private key (up to 2^20)
        privateKey = BigInt(Math.floor(Math.random() * 1048576) + 2);
        break;
      case 'hard':
        // Large private key (full range) (Don't need to worry, this will never be 1)
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
      id: 0,
      public_key: publicKeyHex,
      p2pkh_address: p2pkhAddress,
      tags: [
        `difficulty:${difficulty}`,
        `range:${difficulty === 'easy' ? '1-100' : difficulty === 'medium' ? '1-1M' : 'full'}`,
      ],
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
      if (action.payload) {
        state.challengeId = action.payload.id ?? 0;
        state.challengeAddress = action.payload.p2pkh_address;
        state.challengePublicKey = action.payload.public_key;
        state.challengeTags = action.payload.tags;
      } else {
        state.challengeId = null;
        state.challengeAddress = '';
        state.challengePublicKey = '';
        state.challengeTags = [];
      }
    },
    clearPracticeChallenge: state => {
      state.challengeId = null;
      state.challengeAddress = '';
      state.challengePublicKey = '';
      state.challengeTags = [];
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
        const challenge = action.payload.challenge;
        state.challengeId = challenge.id ?? 0;
        state.challengeAddress = challenge.p2pkh_address;
        state.challengePublicKey = challenge.public_key;
        state.challengeTags = challenge.tags;
      })
      .addCase(generatePracticeChallenge.rejected, state => {
        state.isGenerating = false;
      });
  },
});

export const {
  setDifficulty,
  setPracticePrivateKey,
  setPracticeChallenge,
  clearPracticeChallenge,
} = practiceModeSlice.actions;
export default practiceModeSlice.reducer;
