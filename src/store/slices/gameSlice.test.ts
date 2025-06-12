import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import gameReducer, {
  setGameMode,
  setError,
  setHasWon,
  clearError,
  loadDailyChallenge,
} from './gameSlice';
import type { GameMode } from './gameSlice';
import type { ChallengeData } from '../../types/game';

describe('gameSlice', () => {
  // Create test challenge data (without p2pkh_address)
  const testChallengeData: ChallengeData[] = [
    {
      public_key: '03678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb6',
      tags: ['test', 'challenge1'],
    },
    {
      public_key: '0296b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52',
      tags: ['test', 'challenge2'],
    },
    {
      public_key: '0311db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5c',
      tags: ['test', 'challenge3'],
    },
  ];

  const initialState = {
    gameMode: 'daily' as GameMode,
    challenge: null,
    loading: false,
    error: null,
    hasWon: false,
    gaveUp: false,
    challenges: testChallengeData,
  };

  it('should handle setGameMode', () => {
    const actual = gameReducer(initialState, setGameMode('practice'));
    expect(actual.gameMode).toEqual('practice');
  });

  it('should handle setError', () => {
    const actual = gameReducer(initialState, setError('Test error'));
    expect(actual.error).toEqual('Test error');
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const actual = gameReducer(stateWithError, clearError());
    expect(actual.error).toBeNull();
  });

  it('should handle setHasWon', () => {
    const actual = gameReducer(initialState, setHasWon(true));
    expect(actual.hasWon).toBe(true);
  });
});
