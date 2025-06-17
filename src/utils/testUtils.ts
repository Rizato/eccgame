import { configureStore } from '@reduxjs/toolkit';
import eccCalculatorReducer from '../store/slices/eccCalculatorSlice';
import gameReducer from '../store/slices/gameSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';

/**
 * Creates a test store with all reducers and proper middleware configuration
 * for testing BigInt serialization in ECC operations
 */
export function createTestStore() {
  return configureStore({
    reducer: {
      game: gameReducer,
      dailyCalculator: eccCalculatorReducer,
      practiceCalculator: practiceCalculatorReducer,
      practiceMode: practiceModeReducer,
      theme: themeReducer,
      ui: uiReducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore BigInt values in ECC points for testing
          ignoredActions: [
            'dailyCalculator/addOperationToGraph',
            'practiceCalculator/addOperationToGraph',
            'dailyCalculator/saveState',
            'practiceCalculator/saveState',
            'dailyCalculator/loadState',
            'practiceCalculator/loadState',
          ],
          ignoredPaths: [
            'dailyCalculator.selectedPoint',
            'dailyCalculator.graph',
            'practiceCalculator.selectedPoint',
            'practiceCalculator.graph',
          ],
        },
      }),
  });
}

export type TestStore = ReturnType<typeof createTestStore>;
