import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { getGeneratorPoint } from '../utils/ecc';
import ECCCalculator from './ECCCalculator';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';

// Mock the crypto module to avoid async issues in tests
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('mock-address'),
}));

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      eccCalculator: eccCalculatorSlice,
    },
  });

const renderWithStore = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(<Provider store={store}>{component}</Provider>);
};

describe('ECCCalculator', () => {
  const generatorPoint = getGeneratorPoint();
  const mockOnPointChange = vi.fn();
  const mockOnError = vi.fn();
  const mockOnSavePoint = vi.fn();
  const challengePublicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createDefaultProps = () => ({
    currentPoint: generatorPoint,
    savedPoints: [],
    challengePublicKey,
    onPointChange: mockOnPointChange,
    onError: mockOnError,
    onSavePoint: mockOnSavePoint,
    isLocked: false,
  });

  describe('Basic Rendering', () => {
    it('should render calculator with main sections', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('Current Point')).toBeInTheDocument();
      expect(screen.getByText('Save Point')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('should display point coordinates', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Check for coordinate display
      expect(screen.getByText(/^x:/)).toBeInTheDocument();
      expect(screen.getByText(/^y:/)).toBeInTheDocument();
    });

    it('should show private key for generator point', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('Private Key:')).toBeInTheDocument();
      expect(screen.getByText('0x1')).toBeInTheDocument();
    });
  });

  describe('Calculator Buttons', () => {
    it('should render all number buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Check for all digits 0-9
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('should render hex buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Check for hex letters A-F
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
        expect(screen.getByText(letter)).toBeInTheDocument();
      });
    });

    it('should render operation buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('×')).toBeInTheDocument();
      expect(screen.getByText('÷')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByText('=')).toBeInTheDocument();
    });

    it('should render special buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('0x')).toBeInTheDocument();
      expect(screen.getByText('±')).toBeInTheDocument();
      expect(screen.getByText('⌫')).toBeInTheDocument();
    });

    it('should render quick operation buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('×2')).toBeInTheDocument();
      expect(screen.getByText('÷2')).toBeInTheDocument();
    });
  });

  describe('Point Information Display', () => {
    it('should show compressed public key', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText(/Compressed:/)).toBeInTheDocument();
      expect(
        screen.getByText(/0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798/)
      ).toBeInTheDocument();
    });

    it('should show P2PKH address', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('mock-address')).toBeInTheDocument();
    });
  });

  describe('Infinity Point Handling', () => {
    it('should handle infinity point display', async () => {
      const infinityPoint = { x: 0n, y: 0n, isInfinity: true };
      const props = { ...createDefaultProps(), currentPoint: infinityPoint };

      await act(async () => {
        renderWithStore(<ECCCalculator {...props} />);
      });

      expect(screen.getAllByText(/Point at Infinity/)[0]).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('should show operation instructions', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText(/Use keyboard.*or click buttons/)).toBeInTheDocument();
    });
  });

  describe('Save Point Button', () => {
    it('should be disabled for generator point', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const saveButton = screen.getByText('Save Point');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Props Handling', () => {
    it('should handle locked state', async () => {
      const props = { ...createDefaultProps(), isLocked: true };

      await act(async () => {
        renderWithStore(<ECCCalculator {...props} />);
      });

      // Component should still render but buttons should be disabled
      expect(screen.getByText('Current Point')).toBeInTheDocument();
    });

    it('should handle saved points', async () => {
      const savedPoints = [{ id: '1', label: 'Test Point', point: generatorPoint, timestamp: 1 }];
      const props = { ...createDefaultProps(), savedPoints };

      await act(async () => {
        renderWithStore(<ECCCalculator {...props} />);
      });

      expect(screen.getByText('Current Point')).toBeInTheDocument();
    });
  });
});
