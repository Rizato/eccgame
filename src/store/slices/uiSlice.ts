import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  hasSeenHowToPlay: boolean;
  showHowToPlay: boolean;
  privateKeyDisplayMode: 'decimal' | 'hex';
}

const initialState: UIState = {
  hasSeenHowToPlay: false,
  showHowToPlay: false,
  privateKeyDisplayMode: 'decimal', // Start in decimal mode
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowHowToPlay: (state, action: PayloadAction<boolean>) => {
      state.showHowToPlay = action.payload;
      // Mark as seen when closing
      if (!action.payload && !state.hasSeenHowToPlay) {
        state.hasSeenHowToPlay = true;
      }
    },
    markHowToPlayAsSeen: state => {
      state.hasSeenHowToPlay = true;
      state.showHowToPlay = false;
    },
    openHowToPlay: state => {
      state.showHowToPlay = true;
    },
    closeHowToPlay: state => {
      state.showHowToPlay = false;
      if (!state.hasSeenHowToPlay) {
        state.hasSeenHowToPlay = true;
      }
    },
    setPrivateKeyDisplayMode: (state, action: PayloadAction<'decimal' | 'hex'>) => {
      state.privateKeyDisplayMode = action.payload;
    },
    togglePrivateKeyDisplayMode: state => {
      state.privateKeyDisplayMode = state.privateKeyDisplayMode === 'decimal' ? 'hex' : 'decimal';
    },
  },
});

export const {
  setShowHowToPlay,
  markHowToPlayAsSeen,
  openHowToPlay,
  closeHowToPlay,
  setPrivateKeyDisplayMode,
  togglePrivateKeyDisplayMode,
} = uiSlice.actions;
export default uiSlice.reducer;
