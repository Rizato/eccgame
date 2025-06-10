import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setSelectedPoint,
  clearSelectedPoint,
  setCurrentAddress,
  setError,
  setHasWon,
  setShowVictoryModal,
  setShouldSubmitSolution,
  setChallengePublicKey,
  setVictoryData,
  resetDailyMode,
  selectDailySelectedPointId,
  selectDailySelectedPoint,
  selectDailyCurrentAddress,
  selectDailyError,
  selectDailyHasWon,
  selectDailyShowVictoryModal,
  selectDailyShouldSubmitSolution,
  selectDailyChallengePublicKey,
  selectDailyVictoryData,
} from '../store/slices/dailyModeSlice';
import type { ECPoint } from '../types/ecc';

export const useDailyModeRedux = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const selectedPointId = useAppSelector(selectDailySelectedPointId);
  const selectedPoint = useAppSelector(selectDailySelectedPoint);
  const currentAddress = useAppSelector(selectDailyCurrentAddress);
  const error = useAppSelector(selectDailyError);
  const hasWon = useAppSelector(selectDailyHasWon);
  const showVictoryModal = useAppSelector(selectDailyShowVictoryModal);
  const shouldSubmitSolution = useAppSelector(selectDailyShouldSubmitSolution);
  const challengePublicKey = useAppSelector(selectDailyChallengePublicKey);
  const victoryData = useAppSelector(selectDailyVictoryData);

  // Actions
  const selectPoint = (pointId: string, point: ECPoint) => {
    dispatch(setSelectedPoint({ pointId, point }));
  };

  const clearPoint = () => {
    dispatch(clearSelectedPoint());
  };

  const updateAddress = (address: string) => {
    dispatch(setCurrentAddress(address));
  };

  const updateError = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const updateHasWon = (won: boolean) => {
    dispatch(setHasWon(won));
  };

  const updateShowVictoryModal = (show: boolean) => {
    dispatch(setShowVictoryModal(show));
  };

  const updateShouldSubmitSolution = (should: boolean) => {
    dispatch(setShouldSubmitSolution(should));
  };

  const updateChallengePublicKey = (publicKey: string) => {
    dispatch(setChallengePublicKey(publicKey));
  };

  const updateVictoryData = (privateKey: string, signature: string) => {
    dispatch(setVictoryData({ privateKey, signature }));
  };

  const reset = () => {
    dispatch(resetDailyMode());
  };

  return {
    // State
    selectedPointId,
    selectedPoint,
    currentAddress,
    error,
    hasWon,
    showVictoryModal,
    shouldSubmitSolution,
    challengePublicKey,
    victoryData,

    // Actions
    selectPoint,
    clearPoint,
    updateAddress,
    updateError,
    updateHasWon,
    updateShowVictoryModal,
    updateShouldSubmitSolution,
    updateChallengePublicKey,
    updateVictoryData,
    reset,
  };
};
