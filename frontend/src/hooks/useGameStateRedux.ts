import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setGameMode,
  setChallenge,
  setError,
  setHasWon,
  clearError,
  loadDailyChallenge,
  handleSolve,
  type GameMode,
} from '../store/slices/gameSlice';
import type { Challenge } from '../types/api';

export function useGameStateRedux() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);

  // Load daily challenge when mode changes to daily
  useEffect(() => {
    if (gameState.gameMode === 'daily') {
      dispatch(loadDailyChallenge());
    }
  }, [gameState.gameMode, dispatch]);

  return {
    // State
    gameMode: gameState.gameMode,
    challenge: gameState.challenge,
    loading: gameState.loading,
    error: gameState.error,
    hasWon: gameState.hasWon,
    // Actions
    setGameMode: (mode: GameMode) => dispatch(setGameMode(mode)),
    setChallenge: (challenge: Challenge | null) => dispatch(setChallenge(challenge)),
    setError: (error: string | null) => dispatch(setError(error)),
    setHasWon: (hasWon: boolean) => dispatch(setHasWon(hasWon)),
    loadDailyChallenge: () => dispatch(loadDailyChallenge()),
    handleSolve: (privateKey: string) => dispatch(handleSolve(privateKey)),
    clearError: () => dispatch(clearError()),
  };
}
