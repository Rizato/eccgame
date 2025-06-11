import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  hasSeenHowToPlay: boolean;
  showHowToPlay: boolean;
}

const initialState: UIState = {
  hasSeenHowToPlay: false,
  showHowToPlay: false,
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
  },
});

export const { setShowHowToPlay, markHowToPlayAsSeen, openHowToPlay, closeHowToPlay } =
  uiSlice.actions;
export default uiSlice.reducer;
