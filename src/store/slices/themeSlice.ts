import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Theme, themeUtils } from '../../utils/theme';

interface ThemeState {
  theme: Theme;
}

const initialState: ThemeState = {
  theme: themeUtils.getSystemTheme(),
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
    toggleTheme: state => {
      const newTheme: Theme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
