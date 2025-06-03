import { configureStore } from '@reduxjs/toolkit';
import eccCalculatorReducer from './slices/eccCalculatorSlice';
import gameReducer from './slices/gameSlice';
import practiceModeReducer from './slices/practiceModeSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    eccCalculator: eccCalculatorReducer,
    practiceMode: practiceModeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
