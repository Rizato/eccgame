import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, it, expect, beforeEach } from 'vitest';
import ECCPlayground from '../components/ECCPlayground';
import dailyCalculatorReducer from '../store/slices/eccCalculatorSlice';
import { addMultipleChallenges } from '../store/slices/eccCalculatorSlice';
import gameReducer from '../store/slices/gameSlice';
import practiceCalculatorReducer from '../store/slices/practiceCalculatorSlice';
import practiceModeReducer from '../store/slices/practiceModeSlice';
import themeReducer from '../store/slices/themeSlice';
import uiReducer from '../store/slices/uiSlice';
import { getP2PKHAddress } from '../utils/crypto';
import { addCachedNode, getCachedGraph } from '../utils/graphCache';
import type { RootState } from '../store';
import type { Challenge } from '../types/game';

// Mock challenges with known private keys for testing (don't use G as challenge)
const mockChallenges = [
  {
    publicKey: '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5', // 2G
    tags: ['easy', 'test1'],
  },
  {
    publicKey: '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9', // 3G
    tags: ['medium', 'test2'],
  },
  {
    publicKey: '022f01e5e15cca351daff3843fb70f3c2f0a1bdd05e5af888a67784ef3e10a2a01', // 4G
    tags: ['hard', 'test3'],
  },
];

describe('Multi-Challenge Victory Integration Tests', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        game: gameReducer,
        dailyCalculator: dailyCalculatorReducer,
        practiceCalculator: practiceCalculatorReducer,
        practiceMode: practiceModeReducer,
        theme: themeReducer,
        ui: uiReducer,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            isSerializable: (value: unknown) => {
              if (typeof value === 'bigint') {
                return true;
              }
              if (value === null) {
                return true;
              }
              return (
                typeof value !== 'function' &&
                typeof value !== 'symbol' &&
                typeof value !== 'undefined'
              );
            },
            ignoredPaths: [
              'dailyCalculator',
              'practiceCalculator',
              'practiceMode',
              'game.challenge',
            ],
            ignoredActions: [
              'dailyCalculator/setSelectedPoint',
              'dailyCalculator/addOperationToGraph',
              'dailyCalculator/addBatchOperationsToGraph',
              'dailyCalculator/addMultipleChallenges',
              'dailyCalculator/setChallengePublicKey',
              'practiceCalculator/addOperationToGraph',
              'practiceCalculator/addBatchOperationsToGraph',
            ],
          },
        }),
    });
  });

  it('should show victory modal with correct challenge data when solving any challenge', async () => {
    const user = userEvent.setup();

    // Create a mock daily challenge (this will be challenge 0)
    const dailyChallenge: Challenge = {
      id: 1,
      p2pkh_address: await getP2PKHAddress(mockChallenges[0].publicKey),
      public_key: mockChallenges[0].publicKey,
      tags: mockChallenges[0].tags,
    };

    // Dispatch multiple challenges to the store
    store.dispatch(addMultipleChallenges(mockChallenges));

    // Ensure generator node exists in the graph
    const { getGeneratorPoint } = await import('../utils/ecc');
    const generatorPoint = getGeneratorPoint();
    addCachedNode('daily', generatorPoint, {
      id: 'daily_generator',
      label: 'Generator (G)',
      privateKey: 1n,
      isGenerator: true,
      connectedToG: true,
    });

    // Render the playground with the daily challenge
    render(
      <Provider store={store}>
        <ECCPlayground challenge={dailyChallenge} isPracticeMode={false} />
      </Provider>
    );

    // Verify that multiple challenges are loaded in the graph
    const graph = getCachedGraph('daily');
    expect(graph.nodes.size).toBeGreaterThan(1); // Generator + challenges

    // Find challenge nodes
    const challengeNodes = Array.from(graph.nodes.values()).filter(node => node.isChallenge);
    expect(challengeNodes).toHaveLength(3); // Three mock challenges

    // Simulate solving the second challenge (2G) by performing operations
    // Use calculator to multiply by 2
    const calculatorInput = screen.getByRole('textbox');
    const multiplyButton = screen.getByRole('button', { name: '×' });
    const equalsButton = screen.getByRole('button', { name: '=' });

    // Enter 2 and multiply to get 2G
    await user.type(calculatorInput, '2');
    await user.click(multiplyButton);
    await user.click(equalsButton);

    // Wait for the victory modal to appear
    await waitFor(
      () => {
        const state = store.getState() as RootState;
        expect(state.dailyCalculator.hasWon).toBe(true);
        expect(state.dailyCalculator.showVictoryModal).toBe(true);
      },
      { timeout: 5000 }
    );

    // Wait for the modal content to be visible
    await waitFor(
      () => {
        expect(screen.getByText(/🏆 Private Key Found!/)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // Verify that the modal shows the correct challenge data
    // The second challenge (2G) should be the one that was solved
    const state = store.getState() as RootState;
    expect(state.dailyCalculator.hasWon).toBe(true);
    expect(state.dailyCalculator.solvedChallengeNodeId).toBeTruthy();

    // Check that the solved challenge mapping contains the correct data
    const solvedNodeId = state.dailyCalculator.solvedChallengeNodeId!;
    const challengeMapping = state.dailyCalculator.challengeMapping;
    expect(challengeMapping[solvedNodeId]).toBeDefined();
    expect(challengeMapping[solvedNodeId].publicKey).toBe(mockChallenges[0].publicKey); // 2G challenge
    expect(challengeMapping[solvedNodeId].tags).toEqual(mockChallenges[0].tags);

    // Verify the address is shown in the modal (it should be calculated for the solved challenge)
    const expectedAddress = await getP2PKHAddress(mockChallenges[0].publicKey);
    await waitFor(() => {
      expect(screen.getAllByText(expectedAddress)[0]).toBeInTheDocument();
    });
  });

  it('should track different solved challenges correctly', async () => {
    const user = userEvent.setup();

    // Create a mock daily challenge
    const dailyChallenge: Challenge = {
      id: 1,
      p2pkh_address: await getP2PKHAddress(mockChallenges[0].publicKey),
      public_key: mockChallenges[0].publicKey,
      tags: mockChallenges[0].tags,
    };

    // Dispatch multiple challenges to the store
    store.dispatch(addMultipleChallenges(mockChallenges));

    render(
      <Provider store={store}>
        <ECCPlayground challenge={dailyChallenge} isPracticeMode={false} />
      </Provider>
    );

    // Solve the second challenge (2G) by performing ×2 operation
    const calculatorInput = screen.getByRole('textbox');
    const equalsButton = screen.getByRole('button', { name: '=' });
    const multiplyButton = screen.getByRole('button', { name: '×' });

    // Enter 2 and multiply
    await user.type(calculatorInput, '2');
    await user.click(multiplyButton);
    await user.click(equalsButton);

    // Wait for victory
    await waitFor(
      () => {
        const state = store.getState() as RootState;
        return state.dailyCalculator.hasWon;
      },
      { timeout: 5000 }
    );

    // Verify the correct challenge was solved
    const state = store.getState() as RootState;
    expect(state.dailyCalculator.hasWon).toBe(true);

    const solvedNodeId = state.dailyCalculator.solvedChallengeNodeId!;
    const challengeMapping = state.dailyCalculator.challengeMapping;
    expect(challengeMapping[solvedNodeId].publicKey).toBe(mockChallenges[0].publicKey); // 2G challenge
  });

  it('should properly setup multiple challenges in state', async () => {
    // This test verifies that multiple challenges are properly stored in state

    // Dispatch multiple challenges
    store.dispatch(addMultipleChallenges(mockChallenges));

    // Get the state after challenge setup
    const state = store.getState() as RootState;
    expect(state.dailyCalculator.hasWon).toBe(false);
    expect(state.dailyCalculator.solvedChallengeNodeId).toBeNull();

    // Verify challenge mapping was created correctly
    const challengeMapping = state.dailyCalculator.challengeMapping;
    const challengeNodeIds = state.dailyCalculator.challengeNodeIds;

    expect(challengeNodeIds).toHaveLength(3);
    expect(Object.keys(challengeMapping)).toHaveLength(3);

    // Verify each challenge is mapped correctly
    challengeNodeIds.forEach((nodeId: string, index: number) => {
      expect(challengeMapping[nodeId]).toBeDefined();
      expect(challengeMapping[nodeId].publicKey).toBe(mockChallenges[index].publicKey);
      expect(challengeMapping[nodeId].tags).toEqual(mockChallenges[index].tags);
    });

    // Verify the graph contains the challenge nodes
    const graph = getCachedGraph('daily');
    const challengeNodes = Array.from(graph.nodes.values()).filter(node => node.isChallenge);
    expect(challengeNodes).toHaveLength(3);
  });
});
