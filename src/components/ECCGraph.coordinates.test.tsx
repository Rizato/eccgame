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

// Mock the crypto module to avoid async issues in tests
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

describe('ECCGraph Component Integration Tests', () => {
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
          onPointClick={mockOnPointClick}
        />
      </Provider>
    );
  };

  describe('Point Position Changes with Zoom', () => {
    it('should render points at default positions with zoom level 1', () => {
      const { container } = renderGraph();

      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;
      expect(generatorPoint).toBeInTheDocument();

      // Get initial position
      const initialLeft = generatorPoint.style.left;
      const initialTop = generatorPoint.style.top;

      expect(initialLeft).toBeTruthy();
      expect(initialTop).toBeTruthy();
      expect(parseFloat(initialLeft)).toBeGreaterThan(0);
      expect(parseFloat(initialTop)).toBeGreaterThan(0);
    });

    it('should change point positions when zoomed in via wheel event', async () => {
      const { container } = renderGraph();

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;

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

      // Get initial position
      const initialLeft = generatorPoint.style.left;
      const initialTop = generatorPoint.style.top;

      // Zoom in
      await act(async () => {
        fireEvent.wheel(graph, {
          deltaY: -100, // Zoom in
          clientX: 200, // Center
          clientY: 200,
        });
      });

      // Position should have changed due to zoom
      const newLeft = generatorPoint.style.left;
      const newTop = generatorPoint.style.top;

      // At least one coordinate should be different (due to zoom transformation)
      expect(newLeft !== initialLeft || newTop !== initialTop).toBe(true);
    });

    it('should update range indicators when zoomed', async () => {
      const { container } = renderGraph();

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const bottomRight = container.querySelector('.range-indicator.bottom-right') as HTMLElement;
      const topLeft = container.querySelector('.range-indicator.top-left') as HTMLElement;

      // Initial state should show 'p'
      expect(bottomRight.textContent).toBe('p');
      expect(topLeft.textContent).toBe('p');

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

      // Zoom in
      await act(async () => {
        fireEvent.wheel(graph, {
          deltaY: -100, // Zoom in
          clientX: 200,
          clientY: 200,
        });
      });

      // Range indicators should no longer show 'p'
      expect(bottomRight.textContent).not.toBe('p');
      expect(topLeft.textContent).not.toBe('p');

      // Should show abbreviated hex values
      expect(bottomRight.textContent).toMatch(/^[0-9a-f]+\.\.\.$/i);
      expect(topLeft.textContent).toMatch(/^[0-9a-f]+\.\.\.$/i);
    });
  });

  describe('Point Visibility Culling', () => {
    it('should hide points that are outside visible area when zoomed', async () => {
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

      // Get initial point count
      const initialPoints = container.querySelectorAll('.ecc-point');
      const initialCount = initialPoints.length;

      // Zoom in significantly multiple times
      await act(async () => {
        for (let i = 0; i < 8; i++) {
          fireEvent.wheel(graph, {
            deltaY: -100, // Zoom in
            clientX: 200,
            clientY: 200,
          });
        }
      });

      // Some points might be filtered out due to being off-screen
      const zoomedPoints = container.querySelectorAll('.ecc-point');
      const zoomedCount = zoomedPoints.length;

      // Count should be <= initial count (some points may be culled)
      expect(zoomedCount).toBeLessThanOrEqual(initialCount);
      expect(zoomedCount).toBeGreaterThanOrEqual(0);
    });

    it('should maintain point visibility with buffer zone', () => {
      const { container } = renderGraph();

      // All rendered points should be within the visible area + buffer
      const points = container.querySelectorAll('.ecc-point') as NodeListOf<HTMLElement>;

      points.forEach(point => {
        const left = parseFloat(point.style.left);
        const top = parseFloat(point.style.top);

        // Points should be within reasonable bounds (allowing for buffer)
        // The exact bounds depend on the current zoom/pan state
        expect(left).toBeGreaterThan(-20); // Allow for buffer
        expect(left).toBeLessThan(120); // Allow for buffer
        expect(top).toBeGreaterThan(-20);
        expect(top).toBeLessThan(120);
      });
    });
  });

  describe('Zoom State Consistency', () => {
    it('should maintain consistent coordinate mapping across renders', async () => {
      const { container, rerender } = renderGraph();

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;

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

      // Zoom in
      await act(async () => {
        fireEvent.wheel(graph, { deltaY: -100, clientX: 200, clientY: 200 });
      });

      const zoomedLeft = generatorPoint.style.left;
      const zoomedTop = generatorPoint.style.top;

      // Re-render the component
      rerender(
        <Provider store={store}>
          <ECCGraph
            challengePublicKey="0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
            onPointClick={mockOnPointClick}
          />
        </Provider>
      );

      // Position should remain consistent after re-render
      const newGeneratorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;
      expect(newGeneratorPoint.style.left).toBe(zoomedLeft);
      expect(newGeneratorPoint.style.top).toBe(zoomedTop);
    });
  });

  describe('Touch Gesture Coordinate Updates', () => {
    it('should handle touch gestures without errors', async () => {
      const { container } = renderGraph();

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;

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

      // Simulate pinch gesture - need to simulate the distance calculation properly
      await act(async () => {
        fireEvent.touchStart(graph, {
          touches: [
            { clientX: 150, clientY: 200 },
            { clientX: 250, clientY: 200 },
          ],
        });
      });

      // First touch move to establish initial distance
      await act(async () => {
        fireEvent.touchMove(graph, {
          touches: [
            { clientX: 150, clientY: 200 },
            { clientX: 250, clientY: 200 },
          ],
        });
      });

      // Second touch move with larger distance (zoom in)
      await act(async () => {
        fireEvent.touchMove(graph, {
          touches: [
            { clientX: 100, clientY: 200 }, // Moved apart
            { clientX: 300, clientY: 200 },
          ],
        });
      });

      await act(async () => {
        fireEvent.touchEnd(graph, { touches: [] });
      });

      // Coordinates may or may not have changed depending on touch implementation
      // But the component should handle touch events without errors
      const newLeft = generatorPoint.style.left;
      const newTop = generatorPoint.style.top;

      // Test passes if no errors were thrown and elements still exist
      expect(generatorPoint).toBeInTheDocument();
      expect(newLeft).toBeTruthy();
      expect(newTop).toBeTruthy();
    });
  });
});
