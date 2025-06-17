import { configureStore } from '@reduxjs/toolkit';
import { render, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';
import gameSlice from '../store/slices/gameSlice';
import practiceCalculatorSlice from '../store/slices/practiceCalculatorSlice';
import practiceModeSlice from '../store/slices/practiceModeSlice';
import themeSlice from '../store/slices/themeSlice';
import uiSlice from '../store/slices/uiSlice';
import ECCGraph from './ECCGraph';

// Mock the crypto module
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn(() => Promise.resolve('test-address')),
  hexToBytes: vi.fn((hex: string) => {
    if (hex === '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798') {
      return new Uint8Array([
        0x02, 0x79, 0xbe, 0x66, 0x7e, 0xf9, 0xdc, 0xbb, 0xac, 0x55, 0xa0, 0x62, 0x95, 0xce, 0x87,
        0x0b, 0x07, 0x02, 0x9b, 0xfc, 0xdb, 0x2d, 0xce, 0x28, 0xd9, 0x59, 0xf2, 0x81, 0x5b, 0x16,
        0xf8, 0x17, 0x98,
      ]);
    }
    return new Uint8Array(33);
  }),
  bytesToHex: vi.fn((bytes: Uint8Array) => {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }),
}));

vi.mock('secp256k1', () => ({
  publicKeyConvert: vi.fn(() => new Uint8Array(65).fill(0x04)),
}));

describe('ECCGraph Point Visibility', () => {
  function createTestStore() {
    return configureStore({
      reducer: {
        dailyCalculator: eccCalculatorSlice,
        game: gameSlice,
        practiceCalculator: practiceCalculatorSlice,
        practiceMode: practiceModeSlice,
        theme: themeSlice,
        ui: uiSlice,
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

  let store: ReturnType<typeof createTestStore>;
  let mockOnPointClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createTestStore();
    mockOnPointClick = vi.fn();

    store.dispatch({ type: 'game/setGameMode', payload: 'daily' });
    store.dispatch({ type: 'dailyCalculator/resetToGenerator', payload: undefined });
  });

  const renderGraph = () => {
    return render(
      <Provider store={store}>
        <ECCGraph
          challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
          challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
          onPointClick={mockOnPointClick}
        />
      </Provider>
    );
  };

  it('should not render points with coordinates outside 0-100% range', async () => {
    const { container } = renderGraph();

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

    // Get initial point positions
    const initialPoints = container.querySelectorAll('.ecc-point') as NodeListOf<HTMLElement>;

    // Verify all points are within bounds initially
    initialPoints.forEach(point => {
      const left = parseFloat(point.style.left);
      const top = parseFloat(point.style.top);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });

    // Zoom in significantly to push some points outside visible area
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        fireEvent.wheel(graph, {
          deltaY: -100, // Zoom in
          clientX: 200,
          clientY: 200,
        });
      }
    });

    // Check that all remaining visible points are still within bounds
    const zoomedPoints = container.querySelectorAll('.ecc-point') as NodeListOf<HTMLElement>;

    zoomedPoints.forEach(point => {
      const left = parseFloat(point.style.left);
      const top = parseFloat(point.style.top);

      // With 0 buffer, all points should be strictly within 0-100%
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });
  });

  it('should filter out points when they go outside bounds due to panning', async () => {
    const { container } = renderGraph();

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

    const initialPointCount = container.querySelectorAll('.ecc-point').length;

    // Zoom in first to make panning more effective
    await act(async () => {
      fireEvent.wheel(graph, {
        deltaY: -200, // Zoom in significantly
        clientX: 200,
        clientY: 200,
      });
    });

    // Simulate mouse drag to pan significantly
    await act(async () => {
      fireEvent.mouseDown(graph, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.mouseMove(graph, { clientX: 100, clientY: 100 }); // Drag 100px
      fireEvent.mouseUp(graph);
    });

    // Points that are now outside the visible area should be filtered out
    const pannedPoints = container.querySelectorAll('.ecc-point') as NodeListOf<HTMLElement>;

    // Should have same or fewer points (some may be filtered)
    expect(pannedPoints.length).toBeLessThanOrEqual(initialPointCount);

    // All remaining points should be within bounds
    pannedPoints.forEach(point => {
      const left = parseFloat(point.style.left);
      const top = parseFloat(point.style.top);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });
  });

  it('should handle fullscreen mode with same visibility constraints', async () => {
    const { container } = renderGraph();

    // Open fullscreen
    const fullscreenButton = container.querySelector('.fullscreen-button');
    await act(async () => {
      fireEvent.click(fullscreenButton!);
    });

    const fullscreenGraph = document.querySelector('.ecc-graph-fullscreen') as HTMLElement;
    expect(fullscreenGraph).toBeInTheDocument();

    // Mock getBoundingClientRect for fullscreen graph
    Object.defineProperty(fullscreenGraph, 'getBoundingClientRect', {
      value: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 600,
        height: 600,
        right: 600,
        bottom: 600,
      })),
    });

    // Zoom in fullscreen mode
    await act(async () => {
      for (let i = 0; i < 3; i++) {
        fireEvent.wheel(fullscreenGraph, {
          deltaY: -100,
          clientX: 300,
          clientY: 300,
        });
      }
    });

    // Check that fullscreen points are also within bounds
    const fullscreenPoints = document.querySelectorAll(
      '.ecc-graph-fullscreen .ecc-point'
    ) as NodeListOf<HTMLElement>;

    fullscreenPoints.forEach(point => {
      const left = parseFloat(point.style.left);
      const top = parseFloat(point.style.top);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });
  });
});
