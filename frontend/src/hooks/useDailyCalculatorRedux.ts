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
  submitDailySolution,
  submitSaveToBackend,
  clearShouldSubmitSolution,
} from '../store/slices/eccCalculatorSlice';
import { recordGamePlayed, recordGameWon } from '../store/slices/statsSlice';
import { clearSubmittedSaves } from '../utils/submitSaves';
import { getP2PKHAddress } from '../utils/crypto';
import { pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { storageUtils } from '../utils/storage';
import type { ECPoint, SavedPoint } from '../types/ecc';

export function useDailyCalculatorRedux(challengePublicKey: string) {
  const dispatch = useAppDispatch();
  const dailyState = useAppSelector(state => state.dailyCalculator);
  const gameState = useAppSelector(state => state.game);

  // Update challenge public key when it changes
  useEffect(() => {
    if (challengePublicKey !== dailyState.challengePublicKey) {
      dispatch(setChallengePublicKey(challengePublicKey));
      // Clear submitted saves tracking for new challenge
      clearSubmittedSaves();
    }
  }, [challengePublicKey, dailyState.challengePublicKey, dispatch]);

  // Calculate current address when point changes
  useEffect(() => {
    dispatch(calculateDailyCurrentAddress(dailyState.selectedPoint));
  }, [dailyState.selectedPoint, dispatch]);

  // Check win condition when relevant state changes
  useEffect(() => {
    const checkWinWithAddress = async () => {
      try {
        const challengePoint = publicKeyToPoint(challengePublicKey);
        const pubKey = pointToPublicKey(challengePoint);
        const address = await getP2PKHAddress(pubKey);
        dispatch(checkWinCondition(address));
      } catch {
        dispatch(checkWinCondition(undefined));
      }
    };

    checkWinWithAddress();
  }, [dailyState.selectedPoint, challengePublicKey, dispatch]);

  // Track game as played when first operation is performed
  useEffect(() => {
    if (gameState.challenge && Object.keys(dailyState.graph.edges).length > 0) {
      const challengeUuid = gameState.challenge.uuid;

      // Only mark game played once per challenge
      if (!storageUtils.hasGameStarted(challengeUuid)) {
        storageUtils.markGameStarted(challengeUuid);
        dispatch(recordGamePlayed({ mode: 'daily', challengeId: challengeUuid }));
        console.log('🎮 Game marked as played on first operation for challenge:', challengeUuid);
      }
    }
  }, [dailyState.graph.edges, gameState.challenge, dispatch]);

  // Track win stats when won (and not from giving up)
  useEffect(() => {
    if (dailyState.hasWon && !gameState.gaveUp && gameState.challenge) {
      const trackStatsForWin = async () => {
        try {
          const challengePoint = publicKeyToPoint(challengePublicKey);
          const pubKey = pointToPublicKey(challengePoint);
          const address = await getP2PKHAddress(pubKey);

          // Only increment stats for first win on this address
          const isFirstWin = storageUtils.isFirstWinForAddress(address);

          // Only record win if this is the first time winning this address
          if (isFirstWin) {
            const totalOperations = Object.values(dailyState.graph.edges).reduce((total, edge) => {
              return total + (edge.bundleCount ? Number(edge.bundleCount) : 1);
            }, 0);

            dispatch(recordGameWon({ operations: totalOperations, mode: 'daily' }));
          }
        } catch (error) {
          console.warn('Failed to track win stats:', error);
        }
      };

      trackStatsForWin();
    }
  }, [
    dailyState.hasWon,
    gameState.gaveUp,
    gameState.challenge,
    dailyState.graph.edges,
    challengePublicKey,
    dispatch,
  ]);

  // Submit solution when shouldSubmitSolution is true (only for daily mode)
  useEffect(() => {
    if (dailyState.shouldSubmitSolution && gameState.gameMode === 'daily') {
      console.log('🎯 Submitting daily game solution to backend...');
      dispatch(submitDailySolution());
      dispatch(clearShouldSubmitSolution());
    }
  }, [dailyState.shouldSubmitSolution, gameState.gameMode, dispatch]);

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
      // Also submit to backend for daily mode
      dispatch(
        submitSaveToBackend({
          point: dailyState.selectedPoint,
          label: label || `Point ${dailyState.savedPoints.length + 1}`,
        })
      );
    },
    loadSavedPoint: (savedPoint: SavedPoint) => dispatch(loadSavedPoint(savedPoint)),
  };
}
