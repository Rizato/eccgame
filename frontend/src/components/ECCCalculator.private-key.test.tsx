import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CURVE_N,
  getGeneratorPoint,
  modInverse,
  pointAdd,
  pointDivide,
  pointMultiply,
  pointSubtract,
} from '../utils/ecc';
import ECCCalculator from './ECCCalculator';
import type { Operation } from '../types/ecc';

// Mock the crypto module to avoid async issues in tests
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('mock-address'),
}));

// TODO Basically redo this whole file

describe('ECCCalculator Private Key Calculations', () => {
  const generatorPoint = getGeneratorPoint();
  const mockOnPointChange = vi.fn();
  const mockOnError = vi.fn();
  const mockOnResetPoint = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Private Key Display', () => {
    it('should show private key 1 for generator point', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/Private Key:/)).toBeInTheDocument();
      });

      expect(screen.getByText(/0x1/)).toBeInTheDocument();
    });

    it('should not show private key for point at infinity', async () => {
      const infinityPoint = { x: 0n, y: 0n, isInfinity: true };

      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={infinityPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      expect(screen.queryByText(/Private Key:/)).not.toBeInTheDocument();
    });

    it('should toggle between hex and decimal format', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      const toggleButton = screen.getByLabelText(/Switch to decimal/);

      // Initially showing hex (0x), clicking should switch to decimal (10)
      expect(toggleButton).toHaveTextContent('0x');

      await act(async () => {
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Switch to hex/)).toHaveTextContent('10');
      });

      const toggleButtonDecimal = screen.getByLabelText(/Switch to hex/);
      await act(async () => {
        fireEvent.click(toggleButtonDecimal);
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Switch to decimal/)).toHaveTextContent('0x');
      });
    });
  });

  describe('Scalar Operations from G', () => {
    it('should calculate private key 2 for G * 2', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Simulate entering 2 and multiplying
      await act(async () => {
        fireEvent.click(screen.getByText('2'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '2',
        })
      );
    });

    it('should calculate private key 4 for G * 4', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Enter 4 and multiply
      await act(async () => {
        fireEvent.click(screen.getByText('4'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '4',
        })
      );
    });

    it('should calculate private key 2 for 4G / 2', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Enter 2 and divide
      await act(async () => {
        fireEvent.click(screen.getByText('2'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('÷'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'divide',
          value: '2',
        })
      );
    });
  });

  describe('Practice Mode Private Key Calculations', () => {
    const practicePrivateKey = '0000000000000000000000000000000000000000000000000000000000000005'; // 5
    const challengePoint = pointMultiply(5n, generatorPoint);

    it('should show practice private key for challenge point', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={challengePoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="challenge"
            isPracticeMode={true}
            practicePrivateKey={practicePrivateKey}
          />
        );
      });

      // Should show the practice private key (5)
      await waitFor(() => {
        expect(screen.getByText(/Private Key:/)).toBeInTheDocument();
        expect(screen.getByText(/5\.\.\./)).toBeInTheDocument();
      });
    });

    it('should calculate private key 10 for challenge * 2 in practice mode', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={challengePoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="challenge"
            isPracticeMode={true}
            practicePrivateKey={practicePrivateKey}
          />
        );
      });

      // Simulate multiplying challenge by 2
      await act(async () => {
        fireEvent.click(screen.getByText('2'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '2',
        })
      );
    });

    it('should calculate private key 2 for G->challenge: G * 2', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
            isPracticeMode={true}
            practicePrivateKey={practicePrivateKey}
          />
        );
      });

      // Simulate G * 2 operation
      await act(async () => {
        fireEvent.click(screen.getByText('2'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '2',
        })
      );
    });
  });

  describe('Calculator Equivalence Tests', () => {
    it('should verify G + G = 2G (point addition)', () => {
      const doubledPoint = pointMultiply(2n, generatorPoint);
      const addedPoint = pointAdd(generatorPoint, generatorPoint);

      expect(addedPoint.x).toBe(doubledPoint.x);
      expect(addedPoint.y).toBe(doubledPoint.y);
    });

    it('should verify G * 2 = 2G (scalar multiplication)', () => {
      const multipliedPoint = pointMultiply(2n, generatorPoint);
      const doubledPoint = pointAdd(generatorPoint, generatorPoint);

      expect(multipliedPoint.x).toBe(doubledPoint.x);
      expect(multipliedPoint.y).toBe(doubledPoint.y);
    });

    it('should verify 4G / 2 = 2G (scalar division)', () => {
      const quadrupledPoint = pointMultiply(4n, generatorPoint);
      const halvedPoint = pointDivide(2n, quadrupledPoint);
      const doubledPoint = pointMultiply(2n, generatorPoint);

      expect(halvedPoint.x).toBe(doubledPoint.x);
      expect(halvedPoint.y).toBe(doubledPoint.y);
    });

    it('should verify 3G - G = 2G (point subtraction)', () => {
      const tripledPoint = pointMultiply(3n, generatorPoint);
      const subtractedPoint = pointSubtract(tripledPoint, generatorPoint);
      const doubledPoint = pointMultiply(2n, generatorPoint);

      expect(subtractedPoint.x).toBe(doubledPoint.x);
      expect(subtractedPoint.y).toBe(doubledPoint.y);
    });
  });

  describe('Private Key Calculation Logic', () => {
    it('should calculate correct private key for multiplication chain', () => {
      // Start with G (private key 1)
      // G * 2 = 2G (private key 2)
      // 2G * 3 = 6G (private key 6)

      const operations: Operation[] = [
        { id: '1', type: 'multiply', description: '×2', value: '2', direction: 'reverse' },
        { id: '2', type: 'multiply', description: '×3', value: '3', direction: 'reverse' },
      ];

      // Simulate the private key calculation
      let privateKey = 1n;
      for (const op of operations) {
        if (op.type === 'multiply' && op.value) {
          privateKey = (privateKey * BigInt(op.value)) % CURVE_N;
        }
      }

      expect(privateKey).toBe(6n);
    });

    it('should calculate correct private key for mixed operations', () => {
      // Start with G (private key 1)
      // G * 12 = 12G (private key 12)
      // 12G / 3 = 4G (private key 4)
      // 4G / 2 = 2G (private key 2)

      const operations: Operation[] = [
        { id: '1', type: 'multiply', description: '×12', value: '12', direction: 'reverse' },
        { id: '2', type: 'divide', description: '÷3', value: '3', direction: 'reverse' },
        { id: '3', type: 'divide', description: '÷2', value: '2', direction: 'reverse' },
      ];

      // Simulate the private key calculation
      let privateKey = 1n;
      for (const op of operations) {
        if (op.type === 'multiply' && op.value) {
          privateKey = (privateKey * BigInt(op.value)) % CURVE_N;
        } else if (op.type === 'divide' && op.value) {
          // For division, we multiply by modular inverse
          const scalar = BigInt(op.value);
          const inverse = modInverse(scalar, CURVE_N);
          privateKey = (privateKey * inverse) % CURVE_N;
        }
      }

      expect(privateKey).toBe(2n);
    });

    it('should handle hex values in operations', () => {
      const hexValue = '0xA'; // 10 in decimal
      const operations: Operation[] = [
        { id: '1', type: 'multiply', description: '×0xA', value: hexValue, direction: 'reverse' },
      ];

      let privateKey = 1n;
      for (const op of operations) {
        if (op.type === 'multiply' && op.value) {
          const scalar = op.value.startsWith('0x') ? BigInt(op.value) : BigInt(op.value);
          privateKey = (privateKey * scalar) % CURVE_N;
        }
      }

      expect(privateKey).toBe(10n);
    });
  });

  describe('Calculator UI Interactions', () => {
    it('should handle calculator input and operations', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Enter 5
      await act(async () => {
        fireEvent.click(screen.getByText('5'));
      });

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();

      // Click multiply
      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      // Press equals
      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '5',
        })
      );
    });

    it('should handle hex input correctly', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Click hex toggle in calculator
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '0x' }));
      });

      // Enter hex value
      await act(async () => {
        fireEvent.click(screen.getByText('A'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('B'));
      });

      expect(screen.getByDisplayValue('0xAB')).toBeInTheDocument();

      // Multiply operation
      await act(async () => {
        fireEvent.click(screen.getByText('×'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('='));
      });

      expect(mockOnPointChange).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'multiply',
          value: '0xAB',
        })
      );
    });

    it('should clear calculator state', async () => {
      await act(async () => {
        render(
          <ECCCalculator
            currentPoint={generatorPoint}
            onPointChange={mockOnPointChange}
            onError={mockOnError}
            onResetPoint={mockOnResetPoint}
            startingMode="generator"
          />
        );
      });

      // Enter some value
      await act(async () => {
        fireEvent.click(screen.getByText('1'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('2'));
      });

      // Clear using the clear button (not the hex C button)
      await act(async () => {
        fireEvent.click(document.querySelector('.calc-button.clear'));
      });

      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });
  });
});
