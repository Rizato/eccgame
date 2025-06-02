import { useState, useEffect, useCallback } from 'react';
import type { Challenge } from '../types/api';
import { challengeApi } from '../services/api';
import { storageUtils } from '../utils/storage';

export type GameMode = 'daily' | 'practice';

interface GameState {
  gameMode: GameMode;
  challenge: Challenge | null;
  loading: boolean;
  error: string | null;
  hasWon: boolean;
}

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  setChallenge: (challenge: Challenge | null) => void;
  setError: (error: string | null) => void;
  setHasWon: (hasWon: boolean) => void;
  loadDailyChallenge: () => Promise<void>;
  handleSolve: (privateKey: string) => Promise<void>;
  clearError: () => void;
}

export function useGameState(): GameState & GameActions {
  const [gameMode, setGameMode] = useState<GameMode>('daily');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);

  const loadDailyChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dailyChallenge = await challengeApi.getDailyChallenge();
      setChallenge(dailyChallenge);

      // Check if already won today
      const wonToday = storageUtils.hasWonToday(dailyChallenge.uuid);
      setHasWon(wonToday);
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      setError("Failed to load today's challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSolve = useCallback(
    async (privateKey: string) => {
      if (!challenge) return;

      try {
        // In a real implementation, this would submit to the backend
        // For now, we'll just mark as won locally
        setHasWon(true);
        storageUtils.markWonToday(challenge.uuid);
      } catch (error) {
        console.error('Failed to submit solution:', error);
        setError('Failed to submit solution. Please try again.');
      }
    },
    [challenge]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load daily challenge when mode changes to daily
  useEffect(() => {
    if (gameMode === 'daily') {
      loadDailyChallenge();
    } else {
      // Clear challenge state when switching to practice
      setChallenge(null);
      setHasWon(false);
      setLoading(false);
      setError(null);
    }
  }, [gameMode, loadDailyChallenge]);

  return {
    // State
    gameMode,
    challenge,
    loading,
    error,
    hasWon,
    // Actions
    setGameMode,
    setChallenge,
    setError,
    setHasWon,
    loadDailyChallenge,
    handleSolve,
    clearError,
  };
}
