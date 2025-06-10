import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ECPoint } from '../../types/ecc';

interface DailyModeState {
  selectedPointId: string | null; // Reference to graph node
  selectedPoint: ECPoint | null; // For convenience/performance
  currentAddress: string;
  error: string | null;
  hasWon: boolean;
  showVictoryModal: boolean;
  shouldSubmitSolution: boolean;
  challengePublicKey: string;
  victoryPrivateKey: string;
  signature: string;
}

const initialState: DailyModeState = {
  selectedPointId: null,
  selectedPoint: null,
  currentAddress: '',
  error: null,
  hasWon: false,
  showVictoryModal: false,
  shouldSubmitSolution: false,
  challengePublicKey: '',
  victoryPrivateKey: '',
  signature: '',
};

const dailyModeSlice = createSlice({
  name: 'dailyMode',
  initialState,
  reducers: {
    setSelectedPoint: (state, action: PayloadAction<{ pointId: string; point: ECPoint }>) => {
      const { pointId, point } = action.payload;
      state.selectedPointId = pointId;
      state.selectedPoint = point;
    },

    clearSelectedPoint: state => {
      state.selectedPointId = null;
      state.selectedPoint = null;
    },

    setCurrentAddress: (state, action: PayloadAction<string>) => {
      state.currentAddress = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setHasWon: (state, action: PayloadAction<boolean>) => {
      state.hasWon = action.payload;
    },

    setShowVictoryModal: (state, action: PayloadAction<boolean>) => {
      state.showVictoryModal = action.payload;
    },

    setShouldSubmitSolution: (state, action: PayloadAction<boolean>) => {
      state.shouldSubmitSolution = action.payload;
    },

    setChallengePublicKey: (state, action: PayloadAction<string>) => {
      state.challengePublicKey = action.payload;
    },

    setVictoryData: (state, action: PayloadAction<{ privateKey: string; signature: string }>) => {
      const { privateKey, signature } = action.payload;
      state.victoryPrivateKey = privateKey;
      state.signature = signature;
      state.hasWon = true;
    },

    resetDailyMode: () => initialState,
  },
});

export const {
  setSelectedPoint,
  clearSelectedPoint,
  setCurrentAddress,
  setError,
  setHasWon,
  setShowVictoryModal,
  setShouldSubmitSolution,
  setChallengePublicKey,
  setVictoryData,
  resetDailyMode,
} = dailyModeSlice.actions;

export default dailyModeSlice.reducer;

// Selectors
export const selectDailySelectedPointId = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.selectedPointId;
export const selectDailySelectedPoint = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.selectedPoint;
export const selectDailyCurrentAddress = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.currentAddress;
export const selectDailyError = (state: { dailyMode: DailyModeState }) => state.dailyMode.error;
export const selectDailyHasWon = (state: { dailyMode: DailyModeState }) => state.dailyMode.hasWon;
export const selectDailyShowVictoryModal = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.showVictoryModal;
export const selectDailyShouldSubmitSolution = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.shouldSubmitSolution;
export const selectDailyChallengePublicKey = (state: { dailyMode: DailyModeState }) =>
  state.dailyMode.challengePublicKey;
export const selectDailyVictoryData = (state: { dailyMode: DailyModeState }) => ({
  privateKey: state.dailyMode.victoryPrivateKey,
  signature: state.dailyMode.signature,
});
