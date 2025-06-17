import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
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
          challengeAddress="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
          onPointClick={mockOnPointClick}
        />
      </Provider>
    );
  };

  describe('Point Position', () => {
    it('should render points at default positions', () => {
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

    it('should display static range indicators', () => {
      const { container } = renderGraph();

      const bottomRight = container.querySelector('.range-indicator.bottom-right') as HTMLElement;
      const topLeft = container.querySelector('.range-indicator.top-left') as HTMLElement;

      // Should always show 'p' (static range)
      expect(bottomRight.textContent).toBe('p');
      expect(topLeft.textContent).toBe('p');
    });
  });

  describe('Point Visibility', () => {
    it('should render all points within visible area', () => {
      const { container } = renderGraph();

      // Get point count
      const points = container.querySelectorAll('.ecc-point');
      const pointCount = points.length;

      // Should have at least generator point
      expect(pointCount).toBeGreaterThanOrEqual(1);
    });

    it('should maintain point visibility within bounds', () => {
      const { container } = renderGraph();

      // All rendered points should be within the visible area
      const points = container.querySelectorAll('.ecc-point') as NodeListOf<HTMLElement>;

      points.forEach(point => {
        const left = parseFloat(point.style.left);
        const top = parseFloat(point.style.top);

        // Points should be within reasonable bounds
        expect(left).toBeGreaterThan(-20); // Allow for buffer
        expect(left).toBeLessThan(120); // Allow for buffer
        expect(top).toBeGreaterThan(-20);
        expect(top).toBeLessThan(120);
      });
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent coordinate mapping across renders', () => {
      const { container, rerender } = renderGraph();

      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;
      const initialLeft = generatorPoint.style.left;
      const initialTop = generatorPoint.style.top;

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
      expect(newGeneratorPoint.style.left).toBe(initialLeft);
      expect(newGeneratorPoint.style.top).toBe(initialTop);
    });
  });

  describe('Basic Interaction', () => {
    it('should render without errors', () => {
      const { container } = renderGraph();

      const graph = container.querySelector('.ecc-graph') as HTMLElement;
      const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;

      // Test passes if elements exist without errors
      expect(graph).toBeInTheDocument();
      expect(generatorPoint).toBeInTheDocument();
      expect(generatorPoint.style.left).toBeTruthy();
      expect(generatorPoint.style.top).toBeTruthy();
    });
  });
});
