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
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore BigInt values in Redux state since we're working with cryptographic operations
        isSerializable: (value: any) => {
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
        // Ignore all BigInt-containing paths in eccCalculator and practiceMode
        ignoredPaths: [
          'eccCalculator',
          'practiceMode',
          'game.challenge', // Challenge objects may contain related crypto data
        ],
        // Ignore all actions that might contain or trigger BigInt handling
        ignoredActions: [
          'eccCalculator/setSelectedPoint',
          'eccCalculator/addOperationToGraph',
          'eccCalculator/savePoint',
          'eccCalculator/loadSavedPoint',
          'eccCalculator/setChallengePublicKey',
          'eccCalculator/resetToChallenge',
          'eccCalculator/resetToGenerator',
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
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
