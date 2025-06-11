import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';
import gameSlice from '../store/slices/gameSlice';
import practiceCalculatorSlice from '../store/slices/practiceCalculatorSlice';
import { getGeneratorPoint } from '../utils/ecc';
import ECCCalculator from './ECCCalculator';

// Mock the crypto module to avoid async issues in tests
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('mock-address'),
}));

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      game: gameSlice,
      dailyCalculator: eccCalculatorSlice,
      practiceCalculator: practiceCalculatorSlice,
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
    it('should render calculator interface elements', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('Private Key:')).toBeInTheDocument();
      expect(screen.getByText('=')).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();
      expect(screen.getByText('÷')).toBeInTheDocument();
      expect(screen.getByText('+')).toBeInTheDocument();
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('should show private key display', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('Private Key:')).toBeInTheDocument();
      expect(screen.getByText('0x1')).toBeInTheDocument();
    });

    it('should show generator point coordinates', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(
        screen.getByText(/ 79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8/)
      ).toBeInTheDocument();
    });

    it('should render calculator input field', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const input = screen.getByDisplayValue('');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('Point Information Display', () => {
    it('should display compressed public key', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText(/Compressed:/)).toBeInTheDocument();
      expect(
        screen.getByText(/0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798/)
      ).toBeInTheDocument();
    });

    it('should show save point button', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('☆')).toBeInTheDocument();
    });
  });

  describe('Number Input Buttons', () => {
    it('should render all number buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
    });

    it('should render hex buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
        expect(screen.getByText(letter)).toBeInTheDocument();
      });
    });
  });

  describe('Operation Buttons', () => {
    it('should render quick operation buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('×2')).toBeInTheDocument();
      expect(screen.getByText('÷2')).toBeInTheDocument();
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
  });
});
