import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type OperationType = 'multiply' | 'divide' | 'add' | 'subtract';

interface CalculatorState {
  display: string;
  pendingOperation: OperationType | null;
  lastOperationValue: string | null;
  hexMode: boolean;
}

const initialState: CalculatorState = {
  display: '1',
  pendingOperation: null,
  lastOperationValue: null,
  hexMode: true,
};

const calculatorSlice = createSlice({
  name: 'calculator',
  initialState,
  reducers: {
    setDisplay: (state, action: PayloadAction<string>) => {
      state.display = action.payload;
    },

    setPendingOperation: (state, action: PayloadAction<OperationType | null>) => {
      state.pendingOperation = action.payload;
    },

    setLastOperationValue: (state, action: PayloadAction<string | null>) => {
      state.lastOperationValue = action.payload;
    },

    toggleHexMode: state => {
      state.hexMode = !state.hexMode;
    },

    setHexMode: (state, action: PayloadAction<boolean>) => {
      state.hexMode = action.payload;
    },

    clearCalculator: state => {
      state.display = '1';
      state.pendingOperation = null;
      state.lastOperationValue = null;
    },

    resetCalculator: () => initialState,
  },
});

export const {
  setDisplay,
  setPendingOperation,
  setLastOperationValue,
  toggleHexMode,
  setHexMode,
  clearCalculator,
  resetCalculator,
} = calculatorSlice.actions;

export default calculatorSlice.reducer;

// Selectors
export const selectCalculatorDisplay = (state: { calculator: CalculatorState }) =>
  state.calculator.display;
export const selectPendingOperation = (state: { calculator: CalculatorState }) =>
  state.calculator.pendingOperation;
export const selectLastOperationValue = (state: { calculator: CalculatorState }) =>
  state.calculator.lastOperationValue;
export const selectHexMode = (state: { calculator: CalculatorState }) => state.calculator.hexMode;
export const selectCalculatorState = (state: { calculator: CalculatorState }) => state.calculator;
