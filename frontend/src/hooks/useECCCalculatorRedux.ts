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
  resetToChallengeWithPrivateKey,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  checkWinCondition,
  calculateCurrentAddress,
  setChallengePublicKey,
  setChallengeWithPrivateKey,
} from '../store/slices/eccCalculatorSlice';
import type { ECPoint, SavedPoint } from '../types/ecc';

export function useECCCalculatorRedux(challengePublicKey: string, practicePrivateKey?: string) {
  const dispatch = useAppDispatch();
  const eccState = useAppSelector(state => state.eccCalculator);

  // Update challenge public key when it changes
  useEffect(() => {
    if (challengePublicKey !== eccState.challengePublicKey) {
      if (practicePrivateKey) {
        dispatch(
          setChallengeWithPrivateKey({
            publicKey: challengePublicKey,
            privateKey: practicePrivateKey,
          })
        );
      } else {
        dispatch(setChallengePublicKey(challengePublicKey));
      }
    }
  }, [challengePublicKey, practicePrivateKey, eccState.challengePublicKey, dispatch]);

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
    resetToChallenge: (challengePublicKey: string) => {
      if (practicePrivateKey) {
        dispatch(
          resetToChallengeWithPrivateKey({
            publicKey: challengePublicKey,
            privateKey: practicePrivateKey,
          })
        );
      } else {
        dispatch(resetToChallenge(challengePublicKey));
      }
    },
    resetToGenerator: () => dispatch(resetToGenerator()),
    savePoint: (label?: string) => dispatch(savePoint({ label })),
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
  };
}
