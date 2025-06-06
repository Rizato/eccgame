import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ECCGraph from './ECCGraph';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';
import gameSlice from '../store/slices/gameSlice';
import practiceCalculatorSlice from '../store/slices/practiceCalculatorSlice';
import practiceModeSlice from '../store/slices/practiceModeSlice';

// Mock crypto utilities
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn(() => Promise.resolve('test-address')),
}));

describe('ECCGraph', () => {
  function createTestStore() {
    return configureStore({
      reducer: {
        eccCalculator: eccCalculatorSlice,
        game: gameSlice,
        practiceCalculator: practiceCalculatorSlice,
        practiceMode: practiceModeSlice,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: [
              'eccCalculator/setCurrentPoint',
              'eccCalculator/addGraphNode',
              'practiceCalculator/setCurrentPoint',
              'practiceCalculator/addGraphNode',
            ],
            ignoredPaths: [
              'eccCalculator.currentPoint',
              'eccCalculator.targetPoint',
              'eccCalculator.graph.nodes',
              'practiceCalculator.currentPoint',
              'practiceCalculator.targetPoint',
              'practiceCalculator.graph.nodes',
            ],
          },
        }),
    });
  }

  it('should render ECCGraph with decimal.js coordinate mapping', () => {
    const store = createTestStore();

    // Initialize store state
    store.dispatch({
      type: 'game/setGameMode',
      payload: 'daily',
    });

    store.dispatch({
      type: 'dailyCalculator/setChallengePublicKey',
      payload: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    });

    const { container } = render(
      <Provider store={store}>
        <ECCGraph
          challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
          onPointClick={vi.fn()}
        />
      </Provider>
    );

    // Verify the graph renders
    expect(container.querySelector('.ecc-graph')).toBeInTheDocument();
    expect(container.querySelector('.formula')).toBeInTheDocument();

    // Check that generator point is rendered
    expect(container.querySelector('.generator')).toBeInTheDocument();

    // The key test: verify that decimal.js doesn't throw errors and coordinates are calculated
    const points = container.querySelectorAll('.ecc-point');
    expect(points.length).toBeGreaterThan(0);
  });
});
