import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  showHowToPlayModal: boolean;
  showMobileNav: boolean;
  showErrorBanner: boolean;
}

const initialState: UIState = {
  showHowToPlayModal: false,
  showMobileNav: false,
  showErrorBanner: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setShowHowToPlayModal: (state, action: PayloadAction<boolean>) => {
      state.showHowToPlayModal = action.payload;
    },

    openHowToPlayModal: state => {
      state.showHowToPlayModal = true;
    },

    closeHowToPlayModal: state => {
      state.showHowToPlayModal = false;
    },

    setShowMobileNav: (state, action: PayloadAction<boolean>) => {
      state.showMobileNav = action.payload;
    },

    openMobileNav: state => {
      state.showMobileNav = true;
    },

    closeMobileNav: state => {
      state.showMobileNav = false;
    },

    setShowErrorBanner: (state, action: PayloadAction<boolean>) => {
      state.showErrorBanner = action.payload;
    },

    toggleHowToPlayModal: state => {
      state.showHowToPlayModal = !state.showHowToPlayModal;
    },
  },
});

export const {
  setShowHowToPlayModal,
  openHowToPlayModal,
  closeHowToPlayModal,
  setShowMobileNav,
  openMobileNav,
  closeMobileNav,
  setShowErrorBanner,
  toggleHowToPlayModal,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectShowHowToPlayModal = (state: { ui: UIState }) => state.ui.showHowToPlayModal;
export const selectShowMobileNav = (state: { ui: UIState }) => state.ui.showMobileNav;
export const selectShowErrorBanner = (state: { ui: UIState }) => state.ui.showErrorBanner;
