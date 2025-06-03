import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setCurrentPoint,
  setOperations,
  setError,
  setStartingMode,
  setHasWon,
  setShowVictoryModal,
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
  type StartingMode,
} from '../store/slices/eccCalculatorSlice';
import type { Operation } from '../components/ECCCalculator';
import type { ECPoint } from '../utils/ecc';
import type { SavedPoint } from '../utils/privateKeyCalculation';

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
    dispatch(calculateCurrentAddress(eccState.currentPoint));
  }, [eccState.currentPoint, dispatch]);

  // Check win condition when relevant state changes
  useEffect(() => {
    dispatch(checkWinCondition());
  }, [eccState.currentPoint, eccState.startingMode, dispatch]);

  return {
    // State
    currentPoint: eccState.currentPoint,
    operations: eccState.operations,
    error: eccState.error,
    currentAddress: eccState.currentAddress,
    calculatorDisplay: eccState.calculatorDisplay,
    pendingOperation: eccState.pendingOperation,
    lastOperationValue: eccState.lastOperationValue,
    hexMode: eccState.hexMode,
    startingMode: eccState.startingMode,
    hasWon: eccState.hasWon,
    showVictoryModal: eccState.showVictoryModal,
    savedPoints: eccState.savedPoints,
    currentSavedPoint: eccState.currentSavedPoint,
    // Actions
    setCurrentPoint: (point: ECPoint) => dispatch(setCurrentPoint(point)),
    setOperations: (operations: Operation[]) => dispatch(setOperations(operations)),
    setError: (error: string | null) => dispatch(setError(error)),
    setStartingMode: (mode: StartingMode) => dispatch(setStartingMode(mode)),
    setHasWon: (hasWon: boolean) => dispatch(setHasWon(hasWon)),
    setShowVictoryModal: (show: boolean) => dispatch(setShowVictoryModal(show)),
    clearCalculator: () => dispatch(clearCalculator()),
    addToCalculator: (value: string) => dispatch(addToCalculator(value)),
    backspaceCalculator: () => dispatch(backspaceCalculator()),
    resetToChallenge: (challengePublicKey: string) =>
      dispatch(resetToChallenge(challengePublicKey)),
    resetToGenerator: () => dispatch(resetToGenerator()),
    savePoint: (label?: string) => dispatch(savePoint({ label })),
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
  };
}
