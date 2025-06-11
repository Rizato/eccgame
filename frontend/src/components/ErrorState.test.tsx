import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import ErrorState from './ErrorState';
import gameReducer, { type GameMode } from '../store/slices/gameSlice';
import dailyCalculatorReducer from '../store/slices/eccCalculatorSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';

describe('ErrorState', () => {
  const createMockStore = (error: string | null) => {
    return configureStore({
      reducer: {
        game: gameReducer,
        dailyCalculator: dailyCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
        practiceMode: practiceModeReducer,
      },
      preloadedState: {
        game: {
          gameMode: 'daily' as GameMode,
          challenge: null,
          loading: false,
          hasWon: false,
          gaveUp: false,
          challenges: [],
          error: error,
        },
      },
    });
  };

  it('renders error message when error is provided', () => {
    const store = createMockStore('Network error occurred');

    render(
      <Provider store={store}>
        <ErrorState />
      </Provider>
    );

    expect(screen.getByText('Unable to load challenge')).toBeInTheDocument();
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders default error message when error is null', () => {
    const store = createMockStore(null);

    render(
      <Provider store={store}>
        <ErrorState />
      </Provider>
    );

    expect(screen.getByText('Unable to load challenge')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
