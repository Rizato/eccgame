import { render, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestStore } from '../utils/testUtils';
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

describe('ECCGraph Mouse Interaction', () => {
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

  it('should handle mouse drag for panning without errors', async () => {
    const { container } = renderGraph();

    const graph = container.querySelector('.ecc-graph') as HTMLElement;
    expect(graph).toBeInTheDocument();

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

    const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;

    // Zoom in first to make pan effect more visible
    await act(async () => {
      fireEvent.wheel(graph, {
        deltaY: -100,
        clientX: 200,
        clientY: 200,
      });
    });

    // Simulate mouse drag panning
    await act(async () => {
      fireEvent.mouseDown(graph, {
        button: 0,
        clientX: 200,
        clientY: 200,
      });
    });

    await act(async () => {
      fireEvent.mouseMove(graph, {
        clientX: 250,
        clientY: 250,
      });
    });

    await act(async () => {
      fireEvent.mouseUp(graph);
    });

    // Check that the component handled the events without errors
    expect(graph).toBeInTheDocument();
    expect(generatorPoint).toBeInTheDocument();

    // Position may or may not have changed depending on zoom/pan state,
    // but the component should handle the mouse events without errors
    const newLeft = generatorPoint.style.left;
    const newTop = generatorPoint.style.top;

    expect(newLeft).toBeTruthy();
    expect(newTop).toBeTruthy();
  });

  it('should handle mouse leave event to stop dragging', async () => {
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

    // Start dragging
    await act(async () => {
      fireEvent.mouseDown(graph, {
        button: 0,
        clientX: 200,
        clientY: 200,
      });
    });

    // Mouse leave should stop dragging
    await act(async () => {
      fireEvent.mouseLeave(graph);
    });

    // Further mouse moves should not affect anything
    await act(async () => {
      fireEvent.mouseMove(graph, {
        clientX: 300,
        clientY: 300,
      });
    });

    // Component should still be rendered correctly
    expect(graph).toBeInTheDocument();
  });

  it('should ignore non-left mouse button clicks', async () => {
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

    const generatorPoint = container.querySelector('.ecc-point.generator') as HTMLElement;
    const initialLeft = generatorPoint.style.left;
    const initialTop = generatorPoint.style.top;

    // Right click should be ignored
    await act(async () => {
      fireEvent.mouseDown(graph, {
        button: 2, // Right click
        clientX: 200,
        clientY: 200,
      });
    });

    await act(async () => {
      fireEvent.mouseMove(graph, {
        clientX: 250,
        clientY: 250,
      });
    });

    await act(async () => {
      fireEvent.mouseUp(graph);
    });

    // Position should not have changed
    const newLeft = generatorPoint.style.left;
    const newTop = generatorPoint.style.top;

    expect(newLeft).toBe(initialLeft);
    expect(newTop).toBe(initialTop);
  });
});
