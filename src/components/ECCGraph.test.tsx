import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';
import gameSlice from '../store/slices/gameSlice';
import practiceCalculatorSlice from '../store/slices/practiceCalculatorSlice';
import practiceModeSlice from '../store/slices/practiceModeSlice';
import ECCGraph from './ECCGraph';

// Mock crypto utilities
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn(() => Promise.resolve('test-address')),
  hexToBytes: vi.fn((hex: string) => {
    // Return a proper compressed public key format for generator point
    if (hex === '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798') {
      return new Uint8Array([
        0x02, 0x79, 0xbe, 0x66, 0x7e, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xce, 0x87,
        0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xce, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16,
        0xf8, 0x17, 0x98,
      ]);
    }
    return new Uint8Array(33); // Default for other cases
  }),
  bytesToHex: vi.fn((bytes: Uint8Array) => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }),
  createSignature: vi.fn(() => Promise.resolve('mock-signature')),
  generateSolutionFromPrivateKey: vi.fn(() =>
    Promise.resolve({
      public_key: 'mock-public-key',
      signature: 'mock-signature',
    })
  ),
}));

// Mock secp256k1
vi.mock('secp256k1', () => ({
  publicKeyConvert: vi.fn(() => new Uint8Array(65).fill(0x04)), // Mock uncompressed key
}));

describe('ECCGraph', () => {
  function createTestStore() {
    return configureStore({
      reducer: {
        dailyCalculator: eccCalculatorSlice,
        game: gameSlice,
        practiceCalculator: practiceCalculatorSlice,
        practiceMode: practiceModeSlice,
      },
      middleware: getDefaultMiddleware =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: [
              'dailyCalculator/setCurrentPoint',
              'dailyCalculator/addGraphNode',
              'practiceCalculator/setCurrentPoint',
              'practiceCalculator/addGraphNode',
            ],
            ignoredPaths: [
              'dailyCalculator.selectedPoint',
              'dailyCalculator.graph.nodes',
              'practiceCalculator.selectedPoint',
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

    // Initialize the daily calculator to a valid state first
    store.dispatch({
      type: 'dailyCalculator/resetToGenerator',
      payload: undefined,
    });

    try {
      store.dispatch({
        type: 'dailyCalculator/setChallengePublicKey',
        payload: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      });
    } catch (error) {
      // If setting challenge key fails due to mock issues, just continue with generator state
      console.warn('Failed to set challenge public key:', error);
    }

    const { container } = render(
      <Provider store={store}>
        <ECCGraph
          challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
          challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
          onPointClick={vi.fn()}
        />
      </Provider>
    );

    // Verify the graph renders
    expect(container.querySelector('.ecc-graph')).toBeInTheDocument();
    // Should show goal address in daily mode (default)
    expect(container.querySelector('.goal-address')).toBeInTheDocument();

    // Check that generator point is rendered
    expect(container.querySelector('.generator')).toBeInTheDocument();

    // The key test: verify that decimal.js doesn't throw errors and coordinates are calculated
    const points = container.querySelectorAll('.ecc-point');
    expect(points.length).toBeGreaterThan(0);
  });

  it('should show address in practice mode', () => {
    const store = createTestStore();

    // Initialize store state for practice mode
    store.dispatch({
      type: 'game/setGameMode',
      payload: 'practice',
    });

    store.dispatch({
      type: 'practiceCalculator/resetToGenerator',
      payload: undefined,
    });

    const { container } = render(
      <Provider store={store}>
        <ECCGraph
          challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
          challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
          onPointClick={vi.fn()}
        />
      </Provider>
    );

    // Should show address in practice mode (same as daily mode now)
    expect(container.querySelector('.goal-address')).toBeInTheDocument();
    expect(container.querySelector('.formula')).not.toBeInTheDocument();
  });

  describe('Zoom Functionality', () => {
    let store: ReturnType<typeof createTestStore>;
    let mockOnPointClick: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      store = createTestStore();
      mockOnPointClick = vi.fn();

      // Initialize store state
      store.dispatch({
        type: 'game/setGameMode',
        payload: 'daily',
      });

      store.dispatch({
        type: 'dailyCalculator/resetToGenerator',
        payload: undefined,
      });
    });

    it('should render with default zoom level of 1', () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      const graph = container.querySelector('.ecc-graph');
      expect(graph).toBeInTheDocument();

      // Check that range indicators show default values
      const bottomRight = container.querySelector('.range-indicator.bottom-right');
      const topLeft = container.querySelector('.range-indicator.top-left');
      expect(bottomRight).toHaveTextContent('p');
      expect(topLeft).toHaveTextContent('p');
    });

    it('should handle mouse wheel zoom events', async () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      expect(graph).toBeInTheDocument();

      // Mock getBoundingClientRect for the graph element
      Object.defineProperty(graph, 'getBoundingClientRect', {
        value: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
          right: 400,
          bottom: 400,
        })),
      });

      // Simulate zoom in with wheel event
      await act(async () => {
        fireEvent.wheel(graph, {
          deltaY: -100, // Negative deltaY means zoom in
          clientX: 200, // Center of the graph
          clientY: 200,
        });
      });

      // After zooming, range indicators should show abbreviated values instead of 'p'
      const bottomRight = container.querySelector('.range-indicator.bottom-right');
      const topLeft = container.querySelector('.range-indicator.top-left');

      // Should not show 'p' anymore since we're zoomed in
      expect(bottomRight?.textContent).not.toBe('p');
      expect(topLeft?.textContent).not.toBe('p');
    });

    it('should handle touch events for pinch-to-zoom', async () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      expect(graph).toBeInTheDocument();

      // Mock getBoundingClientRect for the graph element
      Object.defineProperty(graph, 'getBoundingClientRect', {
        value: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
          right: 400,
          bottom: 400,
        })),
      });

      // Start pinch gesture
      await act(async () => {
        fireEvent.touchStart(graph, {
          touches: [
            { clientX: 150, clientY: 200 },
            { clientX: 250, clientY: 200 },
          ],
        });
      });

      // Move touches further apart (pinch out / zoom in)
      await act(async () => {
        fireEvent.touchMove(graph, {
          touches: [
            { clientX: 100, clientY: 200 },
            { clientX: 300, clientY: 200 },
          ],
        });
      });

      // End touch
      await act(async () => {
        fireEvent.touchEnd(graph, {
          touches: [],
        });
      });

      // Verify the component still renders correctly after touch events
      expect(graph).toBeInTheDocument();
    });

    it('should filter out points outside visible area with zoom', async () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const initialPoints = container.querySelectorAll('.ecc-point');
      const initialPointCount = initialPoints.length;

      // Mock getBoundingClientRect
      Object.defineProperty(graph, 'getBoundingClientRect', {
        value: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
          right: 400,
          bottom: 400,
        })),
      });

      // Zoom in significantly to potentially filter some points
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          fireEvent.wheel(graph, {
            deltaY: -100, // Zoom in
            clientX: 200,
            clientY: 200,
          });
        }
      });

      // Points should still be rendered (or filtered out if they're off-screen)
      const zoomedPoints = container.querySelectorAll('.ecc-point');
      expect(zoomedPoints.length).toBeGreaterThanOrEqual(0);
      expect(zoomedPoints.length).toBeLessThanOrEqual(initialPointCount);
    });

    it('should render fullscreen button and open fullscreen modal', async () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      // Find and click fullscreen button
      const fullscreenButton = container.querySelector('.fullscreen-button');
      expect(fullscreenButton).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(fullscreenButton!);
      });

      // Check that fullscreen modal is rendered
      const modal = screen.getByText('×'); // Close button
      expect(modal).toBeInTheDocument();

      // Check that fullscreen graph is rendered
      const fullscreenGraph = document.querySelector('.ecc-graph-fullscreen');
      expect(fullscreenGraph).toBeInTheDocument();

      // Close modal
      await act(async () => {
        fireEvent.click(modal);
      });

      // Modal should be closed
      expect(document.querySelector('.ecc-graph-fullscreen')).not.toBeInTheDocument();
    });

    it('should maintain zoom state between inline and fullscreen views', async () => {
      const { container } = render(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      const graph = container.querySelector('.ecc-graph') as HTMLElement;

      // Mock getBoundingClientRect
      Object.defineProperty(graph, 'getBoundingClientRect', {
        value: vi.fn(() => ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
          right: 400,
          bottom: 400,
        })),
      });

      // Zoom in first
      await act(async () => {
        fireEvent.wheel(graph, {
          deltaY: -100,
          clientX: 200,
          clientY: 200,
        });
      });

      // Check that we're zoomed (range indicators changed)
      const bottomRightBeforeFullscreen = container.querySelector('.range-indicator.bottom-right');
      expect(bottomRightBeforeFullscreen?.textContent).not.toBe('p');

      // Open fullscreen
      const fullscreenButton = container.querySelector('.fullscreen-button');
      await act(async () => {
        fireEvent.click(fullscreenButton!);
      });

      // Check that fullscreen graph also shows zoomed state
      const fullscreenBottomRight = document.querySelector(
        '.ecc-graph-fullscreen .range-indicator.bottom-right'
      );
      expect(fullscreenBottomRight?.textContent).not.toBe('p');
      expect(fullscreenBottomRight?.textContent).toBe(bottomRightBeforeFullscreen?.textContent);
    });
  });
});
