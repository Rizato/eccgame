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
import type { Challenge } from '../../types/game';

describe('gameSlice', () => {
  // Create test challenges
  const testChallenges: Challenge[] = [
    {
      id: 0,
      p2pkh_address: '1Challenge1Address',
      public_key: '0x1234567890abcdef',
      tags: ['test', 'challenge1'],
    },
    {
      id: 1,
      p2pkh_address: '1Challenge2Address',
      public_key: '0xfedcba0987654321',
      tags: ['test', 'challenge2'],
    },
    {
      id: 2,
      p2pkh_address: '1Challenge3Address',
      public_key: '0xabcdef1234567890',
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
    challenges: testChallenges,
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

  it('loads a challenge based on date', () => {
    // Create a mock store with our test state
    const store = configureStore({
      reducer: {
        game: gameReducer,
      },
      preloadedState: {
        game: initialState,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware(),
    });

    // Test with first date - should select challenge at index 2
    const date1 = new Date('2024-01-01');
    vi.setSystemTime(date1);

    // Dispatch the thunk - TypeScript doesn't understand thunk typing in tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.dispatch(loadDailyChallenge() as any);

    // Get the state after dispatch
    const state1 = store.getState().game;

    // Calculate expected index: days since epoch % number of challenges
    const daysSinceEpoch1 = Math.floor(date1.getTime() / (1000 * 60 * 60 * 24));
    const expectedIndex1 = daysSinceEpoch1 % testChallenges.length;

    expect(state1.challenge).toBeDefined();
    expect(state1.challenge?.id).toBe(expectedIndex1);
    expect(state1.challenge?.p2pkh_address).toBe(testChallenges[expectedIndex1].p2pkh_address);

    // Test with second date - should select a different challenge
    const date2 = new Date('2024-01-02');
    vi.setSystemTime(date2);

    // Reset store for second test
    const store2 = configureStore({
      reducer: {
        game: gameReducer,
      },
      preloadedState: {
        game: initialState,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware(),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store2.dispatch(loadDailyChallenge() as any);
    const state2 = store2.getState().game;

    const daysSinceEpoch2 = Math.floor(date2.getTime() / (1000 * 60 * 60 * 24));
    const expectedIndex2 = daysSinceEpoch2 % testChallenges.length;

    expect(state2.challenge).toBeDefined();
    expect(state2.challenge?.id).toBe(expectedIndex2);
    expect(state2.challenge?.p2pkh_address).toBe(testChallenges[expectedIndex2].p2pkh_address);

    // Verify different challenges were selected
    expect(state1.challenge?.id).not.toEqual(state2.challenge?.id);

    vi.useRealTimers();
  });
});
