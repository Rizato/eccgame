import { type Action, configureStore, type ThunkAction } from '@reduxjs/toolkit';
import calculatorReducer from './slices/calculatorSlice';
import dailyModeReducer from './slices/dailyModeSlice';
import dailyCalculatorReducer from './slices/eccCalculatorSlice';
import gameReducer from './slices/gameSlice';
import gameManagementReducer from './slices/gameManagementSlice';
import graphReducer from './slices/graphSlice';
import practiceCalculatorReducer from './slices/practiceCalculatorSlice';
import practiceModeReducer from './slices/practiceModeSlice';
import savedPointsReducer from './slices/savedPointsSlice';
import savePointModalReducer from './slices/savePointModalSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
    dailyCalculator: dailyCalculatorReducer,
    practiceCalculator: practiceCalculatorReducer,
    practiceMode: practiceModeReducer,
    // New flattened slices
    graph: graphReducer,
    calculator: calculatorReducer,
    savedPoints: savedPointsReducer,
    dailyMode: dailyModeReducer,
    ui: uiReducer,
    gameManagement: gameManagementReducer,
    savePointModal: savePointModalReducer,
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
        // Ignore all BigInt-containing paths in calculators and practiceMode
        ignoredPaths: [
          'dailyCalculator',
          'practiceCalculator',
          'practiceMode',
          'game.challenge', // Challenge objects may contain related crypto data
          'graph', // Graph nodes contain BigInt privateKey
          'savedPoints', // Saved points may contain BigInt privateKey
          'dailyMode', // Daily mode contains ECPoint with BigInt
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
  devTools: process.env.NODE_ENV !== 'production' && {
    serialize: {
      replacer: (_key: string, value: any) => {
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
