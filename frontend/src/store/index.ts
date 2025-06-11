import { type Action, configureStore, type ThunkAction } from '@reduxjs/toolkit';
import dailyCalculatorReducer from './slices/eccCalculatorSlice';
import gameReducer from './slices/gameSlice';
import practiceCalculatorReducer from './slices/practiceCalculatorSlice';
import practiceModeReducer from './slices/practiceModeSlice';
import themeReducer from './slices/themeSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    dailyCalculator: dailyCalculatorReducer,
    practiceCalculator: practiceCalculatorReducer,
    practiceMode: practiceModeReducer,
    theme: themeReducer,
    ui: uiReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore BigInt values in Redux state since we're working with cryptographic operations
        isSerializable: (value: unknown) => {
          // Allow BigInt values
          if (typeof value === 'bigint') {
            return true;
          }
          // Allow null values (they should be serializable by default)
          if (value === null) {
            return true;
          }
          // Use default check for other values
          return (
            typeof value !== 'function' && typeof value !== 'symbol' && typeof value !== 'undefined'
          );
        },
        // Ignore all BigInt-containing paths in calculators and practiceMode
        ignoredPaths: [
          'dailyCalculator',
          'practiceCalculator',
          'practiceMode',
          'game.challenge', // Challenge objects may contain related crypto data
        ],
        // Ignore all actions that might contain or trigger BigInt handling
        ignoredActions: [
          'dailyCalculator/setSelectedPoint',
          'dailyCalculator/addOperationToGraph',
          'dailyCalculator/savePoint',
          'dailyCalculator/loadSavedPoint',
          'dailyCalculator/setChallengePublicKey',
          'dailyCalculator/resetToChallenge',
          'dailyCalculator/resetToGenerator',
          'practiceCalculator/setSelectedPoint',
          'practiceCalculator/addOperationToGraph',
          'practiceCalculator/savePoint',
          'practiceCalculator/loadSavedPoint',
          'practiceCalculator/setChallengeWithPrivateKey',
          'practiceCalculator/resetToChallengeWithPrivateKey',
          'practiceCalculator/resetToGenerator',
          'practiceMode/setCurrentPoint',
          'practiceMode/addOperationToGraph',
          'game/loadDailyChallenge/rejected',
          'game/loadDailyChallenge/fulfilled',
          'game/loadDailyChallenge/pending',
        ],
        // Ignore undefined values in action payloads
        ignoredActionPaths: ['payload', 'meta.arg'],
      },
    }),
  // Enable Redux DevTools
  // Redux DevTools with BigInt serialization support
  devTools: import.meta.env.DEV && {
    serialize: {
      replacer: (_key: string, value: unknown) => {
        if (typeof value === 'bigint') {
          return `0x${value.toString(16)})`;
        }
        return value;
      },
    },
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ThunkReturnType = void> = ThunkAction<
  ThunkReturnType,
  RootState,
  unknown,
  Action
>;
