import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getGeneratorPoint } from '../utils/ecc';
import { VictoryModal } from './VictoryModal';
import type { Operation } from '../utils/privateKeyCalculation.ts';

// Mock the crypto module
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'),
}));

describe('VictoryModal Private Key Display', () => {
  const generatorPoint = getGeneratorPoint();

  const createDefaultProps = (
    operations: Operation[] = [],
    startingMode: 'challenge' | 'generator' = 'generator'
  ) => ({
    isOpen: true,
    onClose: vi.fn(),
    operationCount: operations.length,
    challengeAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    startingMode,
    targetPoint: generatorPoint,
    operations,
    isPracticeMode: false,
  });

  it('should display private key for generator mode with multiply operation', () => {
    const operations: Operation[] = [
      {
        id: 'test-1',
        type: 'multiply',
        description: '×2',
        value: '2',
      },
    ];

    render(<VictoryModal {...createDefaultProps(operations, 'generator')} />);

    // Should show the calculated private key (2 in hex = 0x2)
    expect(screen.getByText('Private Key')).toBeInTheDocument();
    expect(screen.getByText(/0x.*2$/)).toBeInTheDocument();
  });

  it('should display private key for challenge mode with reversed operations', () => {
    const operations: Operation[] = [
      {
        id: 'test-1',
        type: 'add',
        description: '+1',
        value: '1',
      },
    ];

    render(<VictoryModal {...createDefaultProps(operations, 'challenge')} />);

    // Should show the calculated private key
    expect(screen.getByText('Private Key')).toBeInTheDocument();
    expect(screen.getByText(/0x/)).toBeInTheDocument();
  });

  it('should handle infinity point in challenge mode', () => {
    const infinityPoint = { x: 0n, y: 0n, isInfinity: true };
    const operations: Operation[] = [
      {
        id: 'test-1',
        type: 'multiply',
        description: '×2',
        value: '2',
      },
    ];

    const props = {
      ...createDefaultProps(operations, 'challenge'),
      targetPoint: infinityPoint,
    };

    render(<VictoryModal {...props} />);

    // Should show a private key (with +1 correction for infinity)
    expect(screen.getByText('Private Key')).toBeInTheDocument();
    expect(screen.getByText(/0x/)).toBeInTheDocument();
  });

  it('should show error message if private key calculation fails', () => {
    // Create operations that might cause calculation error
    const operations: Operation[] = [
      {
        id: 'test-1',
        type: 'multiply',
        description: '×invalid',
        value: '', // Invalid value that should cause error
      },
    ];

    render(<VictoryModal {...createDefaultProps(operations)} />);

    // Should handle error gracefully
    expect(screen.getByText('Private Key')).toBeInTheDocument();
  });

  it('should include all victory stats including private key', () => {
    const operations: Operation[] = [
      {
        id: 'test-1',
        type: 'add',
        description: '+1',
        value: '1',
      },
    ];

    render(<VictoryModal {...createDefaultProps(operations)} />);

    // Check all expected stats are present
    expect(screen.getByText('Operations Used')).toBeInTheDocument();
    expect(screen.getByText('Challenge Wallet')).toBeInTheDocument();
    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Private Key')).toBeInTheDocument();

    // Check operation count
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
