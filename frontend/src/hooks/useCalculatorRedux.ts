import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setDisplay,
  setPendingOperation,
  setLastOperationValue,
  toggleHexMode,
  setHexMode,
  clearCalculator,
  resetCalculator,
  selectCalculatorDisplay,
  selectPendingOperation,
  selectLastOperationValue,
  selectHexMode,
  selectCalculatorState,
  type OperationType,
} from '../store/slices/calculatorSlice';

export const useCalculatorRedux = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const display = useAppSelector(selectCalculatorDisplay);
  const pendingOperation = useAppSelector(selectPendingOperation);
  const lastOperationValue = useAppSelector(selectLastOperationValue);
  const hexMode = useAppSelector(selectHexMode);
  const calculatorState = useAppSelector(selectCalculatorState);

  // Actions
  const updateDisplay = (value: string) => {
    dispatch(setDisplay(value));
  };

  const setPending = (operation: OperationType | null) => {
    dispatch(setPendingOperation(operation));
  };

  const setLastValue = (value: string | null) => {
    dispatch(setLastOperationValue(value));
  };

  const toggleMode = () => {
    dispatch(toggleHexMode());
  };

  const setMode = (mode: boolean) => {
    dispatch(setHexMode(mode));
  };

  const clear = () => {
    dispatch(clearCalculator());
  };

  const reset = () => {
    dispatch(resetCalculator());
  };

  return {
    // State
    display,
    pendingOperation,
    lastOperationValue,
    hexMode,
    calculatorState,

    // Actions
    updateDisplay,
    setPending,
    setLastValue,
    toggleMode,
    setMode,
    clear,
    reset,
  };
};
