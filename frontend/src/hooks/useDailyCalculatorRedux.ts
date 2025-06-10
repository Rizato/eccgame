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
  calculateDailyCurrentAddress,
  setChallengePublicKey,
} from '../store/slices/eccCalculatorSlice';
import type { ECPoint, SavedPoint } from '../types/ecc';

export function useDailyCalculatorRedux(challengePublicKey: string) {
  const dispatch = useAppDispatch();
  const dailyState = useAppSelector(state => state.dailyCalculator);

  // Update challenge public key when it changes
  useEffect(() => {
    if (challengePublicKey !== dailyState.challengePublicKey) {
      dispatch(setChallengePublicKey(challengePublicKey));
    }
  }, [challengePublicKey, dailyState.challengePublicKey, dispatch]);

  // Calculate current address when point changes
  useEffect(() => {
    dispatch(calculateDailyCurrentAddress(dailyState.selectedPoint));
  }, [dailyState.selectedPoint, dispatch]);

  // Check win condition when relevant state changes
  useEffect(() => {
    dispatch(checkWinCondition());
  }, [dailyState.selectedPoint, challengePublicKey, dispatch]);

  return {
    // State
    currentPoint: dailyState.selectedPoint,
    graph: dailyState.graph,
    error: dailyState.error,
    currentAddress: dailyState.currentAddress,
    calculatorDisplay: dailyState.calculatorDisplay,
    pendingOperation: dailyState.pendingOperation,
    lastOperationValue: dailyState.lastOperationValue,
    hexMode: dailyState.hexMode,
    hasWon: dailyState.hasWon,
    showVictoryModal: dailyState.showVictoryModal,
    savedPoints: dailyState.savedPoints,
    shouldSubmitSolution: dailyState.shouldSubmitSolution,
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
    resetToChallenge: (challengePublicKey: string) => {
      dispatch(resetToChallenge(challengePublicKey));
    },
    resetToGenerator: () => dispatch(resetToGenerator()),
    savePoint: (label?: string) => {
      dispatch(savePoint({ label }));
    },
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
  };
}
