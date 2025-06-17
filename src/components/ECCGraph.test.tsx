import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect, vi } from 'vitest';
import { createTestStore } from '../utils/testUtils';
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
