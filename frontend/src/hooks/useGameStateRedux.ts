import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setGameMode,
  loadDailyChallenge,
  setError,
  setHasWon,
  clearError,
  type GameMode,
} from '../store/slices/gameSlice';

export function useGameStateRedux() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector(state => state.game);

  // Load daily challenge when mode changes to daily (with debouncing)
  useEffect(() => {
    if (gameState.gameMode === 'daily' && !gameState.challenge) {
      dispatch(loadDailyChallenge());
    }
  }, [gameState.gameMode, gameState.challenge]);

  return {
    // State
    gameMode: gameState.gameMode,
    challenge: gameState.challenge,
    loading: gameState.loading,
    error: gameState.error,
    hasWon: gameState.hasWon,
    // Actions
    setGameMode: (mode: GameMode) => dispatch(setGameMode(mode)),
    setError: (error: string | null) => dispatch(setError(error)),
    setHasWon: (hasWon: boolean) => dispatch(setHasWon(hasWon)),
    clearError: () => dispatch(clearError()),
  };
}
