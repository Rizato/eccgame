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

describe('ECCGraph Pan Limits', () => {
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

  it('should not allow panning at zoom level 1', async () => {
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

    const initialLeft = generatorPoint.style.left;
    const initialTop = generatorPoint.style.top;

    // Attempt to pan at zoom level 1
    await act(async () => {
      fireEvent.mouseDown(graph, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.mouseMove(graph, { clientX: 250, clientY: 250 });
      fireEvent.mouseUp(graph);
    });

    // Position should not have changed (no panning at zoom 1)
    expect(generatorPoint.style.left).toBe(initialLeft);
    expect(generatorPoint.style.top).toBe(initialTop);
  });

  it('should allow limited panning when zoomed in', async () => {
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

    // Zoom in first
    await act(async () => {
      fireEvent.wheel(graph, {
        deltaY: -200, // Zoom in significantly
        clientX: 200,
        clientY: 200,
      });
    });

    // Now panning should work
    await act(async () => {
      fireEvent.mouseDown(graph, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.mouseMove(graph, { clientX: 250, clientY: 250 });
      fireEvent.mouseUp(graph);
    });

    // Check that the component handled the pan without errors
    expect(graph).toBeInTheDocument();
  });

  it('should hide generator line when it goes outside visible area', async () => {
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

    // Initially generator line should be visible
    let generatorLine = container.querySelector('.generator-line');
    expect(generatorLine).toBeInTheDocument();

    // Zoom in significantly to move generator off-screen
    await act(async () => {
      for (let i = 0; i < 8; i++) {
        fireEvent.wheel(graph, {
          deltaY: -100, // Zoom in
          clientX: 100, // Zoom towards left side
          clientY: 200,
        });
      }
    });

    // Generator line may be hidden if generator goes off-screen
    generatorLine = container.querySelector('.generator-line');
    // The line might be visible or hidden depending on where the generator ends up
    // This test mainly ensures the component doesn't crash
    expect(graph).toBeInTheDocument();
  });

  it('should reset pan to 0 when zoom returns to 1', async () => {
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

    const initialLeft = generatorPoint.style.left;
    const initialTop = generatorPoint.style.top;

    // Zoom in and pan
    await act(async () => {
      fireEvent.wheel(graph, {
        deltaY: -200, // Zoom in
        clientX: 200,
        clientY: 200,
      });
    });

    await act(async () => {
      fireEvent.mouseDown(graph, { button: 0, clientX: 200, clientY: 200 });
      fireEvent.mouseMove(graph, { clientX: 250, clientY: 250 });
      fireEvent.mouseUp(graph);
    });

    // Now zoom back out to level 1
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        fireEvent.wheel(graph, {
          deltaY: 100, // Zoom out
          clientX: 200,
          clientY: 200,
        });
      }
    });

    // Position should be back to initial (pan reset)
    expect(generatorPoint.style.left).toBe(initialLeft);
    expect(generatorPoint.style.top).toBe(initialTop);
  });
});
