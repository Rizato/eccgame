import { useEffect, useRef } from 'react';
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
  const lastLoadRef = useRef<number>(0);

  // Load daily challenge when mode changes to daily (with debouncing)
  useEffect(() => {
    if (gameState.gameMode === 'daily' && !gameState.challenge && !gameState.loading) {
      const now = Date.now();
      // Debounce: only load if it's been at least 2 seconds since last attempt
      if (now - lastLoadRef.current > 2000) {
        lastLoadRef.current = now;
        dispatch(loadDailyChallenge());
      }
    }
  }, [gameState.gameMode, gameState.challenge, gameState.loading, dispatch]);

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
