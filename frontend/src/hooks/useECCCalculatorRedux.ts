import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setSelectedPoint,
  setError,
  setHasWon,
  setShowVictoryModal,
  setPendingOperation,
  clearCalculator,
  addToCalculator,
  backspaceCalculator,
  resetToChallenge,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  checkWinCondition,
  calculateCurrentAddress,
  setChallengePublicKey,
  executeCalculatorOperation,
  setCalculatorOperationThunk,
  executeEqualsOperation,
} from '../store/slices/eccCalculatorSlice';
import type { ECPoint, SavedPoint } from '../types/ecc';

export function useECCCalculatorRedux(challengePublicKey: string, isPracticeMode: boolean = false) {
  const dispatch = useAppDispatch();
  const eccState = useAppSelector(state => state.eccCalculator);

  // Update challenge public key when it changes
  useEffect(() => {
    if (challengePublicKey !== eccState.challengePublicKey) {
      dispatch(setChallengePublicKey(challengePublicKey));
    }
  }, [challengePublicKey, eccState.challengePublicKey, dispatch]);

  // Calculate current address when point changes
  useEffect(() => {
    dispatch(calculateCurrentAddress(eccState.selectedPoint));
  }, [eccState.selectedPoint, dispatch]);

  // Check win condition when relevant state changes
  useEffect(() => {
    dispatch(checkWinCondition());
  }, [eccState.selectedPoint, dispatch]);

  return {
    // State
    currentPoint: eccState.selectedPoint,
    graph: eccState.graph,
    error: eccState.error,
    currentAddress: eccState.currentAddress,
    calculatorDisplay: eccState.calculatorDisplay,
    pendingOperation: eccState.pendingOperation,
    lastOperationValue: eccState.lastOperationValue,
    hexMode: eccState.hexMode,
    hasWon: eccState.hasWon,
    showVictoryModal: eccState.showVictoryModal,
    savedPoints: eccState.savedPoints,
    // Actions
    setCurrentPoint: (point: ECPoint) => dispatch(setSelectedPoint(point)),
    setError: (error: string | null) => dispatch(setError(error)),
    setHasWon: (hasWon: boolean) => dispatch(setHasWon(hasWon)),
    setShowVictoryModal: (show: boolean) => dispatch(setShowVictoryModal(show)),
    setPendingOperation: (op: 'multiply' | 'divide' | 'add' | 'subtract' | null) =>
      dispatch(setPendingOperation(op)),
    clearCalculator: () => dispatch(clearCalculator()),
    addToCalculator: (value: string) => dispatch(addToCalculator(value)),
    backspaceCalculator: () => dispatch(backspaceCalculator()),
    resetToChallenge: (challengePublicKey: string) =>
      dispatch(resetToChallenge(challengePublicKey)),
    resetToGenerator: () => dispatch(resetToGenerator()),
    savePoint: (label?: string) => dispatch(savePoint({ label })),
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
    // New Redux-centralized operations
    executeCalculatorOperation: (
      operation: 'multiply' | 'divide' | 'add' | 'subtract',
      value: string
    ) => dispatch(executeCalculatorOperation({ operation, value })),
    setCalculatorOperation: (operation: 'multiply' | 'divide' | 'add' | 'subtract') =>
      dispatch(setCalculatorOperationThunk(operation)),
    executeEquals: () => dispatch(executeEqualsOperation()),
  };
}
