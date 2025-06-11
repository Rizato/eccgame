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
  resetToChallengeWithPrivateKey,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  checkWinCondition,
  calculatePracticeCurrentAddress,
  setChallengeWithPrivateKey,
  clearPracticeState,
} from '../store/slices/practiceCalculatorSlice';
import type { ECPoint, SavedPoint } from '../types/ecc';

export function usePracticeCalculatorRedux(challengePublicKey: string, practicePrivateKey: string) {
  const dispatch = useAppDispatch();
  const practiceState = useAppSelector(state => state.practiceCalculator);

  // Clear state and set new challenge when challenge changes
  useEffect(() => {
    if (
      challengePublicKey !== practiceState.challengePublicKey ||
      practicePrivateKey !== practiceState.practicePrivateKey
    ) {
      // Only dispatch if we have a valid private key
      if (practicePrivateKey && practicePrivateKey.length > 0) {
        // Clear the practice state first if this is a new challenge (not just initialization)
        if (
          practiceState.challengePublicKey &&
          challengePublicKey !== practiceState.challengePublicKey
        ) {
          dispatch(clearPracticeState());
        }

        dispatch(
          setChallengeWithPrivateKey({
            publicKey: challengePublicKey,
            privateKey: practicePrivateKey,
          })
        );
      }
    }
  }, [
    challengePublicKey,
    practicePrivateKey,
    practiceState.challengePublicKey,
    practiceState.practicePrivateKey,
    dispatch,
  ]);

  // Calculate current address when point changes
  useEffect(() => {
    dispatch(calculatePracticeCurrentAddress(practiceState.selectedPoint));
  }, [practiceState.selectedPoint, dispatch]);

  // Check win condition when relevant state changes
  useEffect(() => {
    dispatch(checkWinCondition());
  }, [practiceState.selectedPoint, dispatch]);

  return {
    // State
    currentPoint: practiceState.selectedPoint,
    graph: practiceState.graph,
    error: practiceState.error,
    currentAddress: practiceState.currentAddress,
    calculatorDisplay: practiceState.calculatorDisplay,
    pendingOperation: practiceState.pendingOperation,
    lastOperationValue: practiceState.lastOperationValue,
    hexMode: practiceState.hexMode,
    hasWon: practiceState.hasWon,
    showVictoryModal: practiceState.showVictoryModal,
    savedPoints: practiceState.savedPoints,
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
      // Only reset with private key if we have a valid one
      if (practicePrivateKey && practicePrivateKey.length > 0) {
        dispatch(
          resetToChallengeWithPrivateKey({
            publicKey: challengePublicKey,
            privateKey: practicePrivateKey,
          })
        );
      }
    },
    resetToGenerator: () => dispatch(resetToGenerator()),
    savePoint: (label?: string) => dispatch(savePoint({ label })),
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
  };
}
