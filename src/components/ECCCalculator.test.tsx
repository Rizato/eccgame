import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import eccCalculatorSlice from '../store/slices/eccCalculatorSlice';
import gameSlice from '../store/slices/gameSlice';
import practiceCalculatorSlice from '../store/slices/practiceCalculatorSlice';
import practiceModeSlice from '../store/slices/practiceModeSlice';
import themeSlice from '../store/slices/themeSlice';
import uiSlice from '../store/slices/uiSlice';
import { getGeneratorPoint, CURVE_N } from '../utils/ecc';
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
      practiceMode: practiceModeSlice,
      theme: themeSlice,
      ui: uiSlice,
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

      expect(screen.getByText('Private Key:')).toBeInTheDocument();
      expect(screen.getByText('☆')).toBeInTheDocument();
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
      const privateKeyDisplay = screen.getByTitle('Click to switch to hex');
      expect(privateKeyDisplay).toHaveTextContent('1');
    });
  });

  describe('Calculator Buttons', () => {
    it('should render all number buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Check for all digits 0-9 as buttons
      for (let i = 0; i <= 9; i++) {
        const numberButtons = screen.getAllByText(i.toString());
        expect(numberButtons.length).toBeGreaterThan(0);
        // Check at least one is a button
        const hasButton = numberButtons.some(element => element.tagName === 'BUTTON');
        expect(hasButton).toBe(true);
      }
    });

    it('should render hex buttons', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Check for hex letters A-F
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByTestId('hex-c-button')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
      expect(screen.getByText('F')).toBeInTheDocument();
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

      expect(screen.getByTestId('clear-button')).toBeInTheDocument();
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

  describe('☆ Button', () => {
    it('should be disabled for generator point', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const saveButton = screen.getByText('☆');
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
      expect(screen.getByText('Private Key:')).toBeInTheDocument();
    });

    it('should handle saved points', async () => {
      const savedPoints = [{ id: '1', label: 'Test Point', point: generatorPoint, timestamp: 1 }];
      const props = { ...createDefaultProps(), savedPoints };

      await act(async () => {
        renderWithStore(<ECCCalculator {...props} />);
      });

      expect(screen.getByText('Private Key:')).toBeInTheDocument();
    });
  });

  describe('Rand Button', () => {
    it('should render rand button', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      expect(screen.getByText('rand')).toBeInTheDocument();
    });

    it('should be enabled when calculator display is empty', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const randButton = screen.getByText('rand');
      expect(randButton).not.toBeDisabled();
    });

    it('should work even when calculator display has content', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      // Add some content to the calculator display - find the button specifically
      const numberButtons = screen.getAllByText('1');
      const buttonElement = numberButtons.find(element => element.tagName === 'BUTTON');
      expect(buttonElement).toBeDefined();

      fireEvent.click(buttonElement!);

      const randButton = screen.getByText('rand');
      expect(randButton).not.toBeDisabled();

      // Should be able to click it and replace the content
      await act(async () => {
        fireEvent.click(randButton);
      });

      // Should now have a hex value that starts with 0x
      const input = screen.getByDisplayValue(/^0x/);
      expect(input).toBeInTheDocument();
    });

    it('should generate random number when clicked', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const randButton = screen.getByText('rand');

      await act(async () => {
        fireEvent.click(randButton);
      });

      // Check that display now has a hex value
      const displayElement = screen.getByDisplayValue(/^0x[0-9A-F]+$/i);
      expect(displayElement).toBeInTheDocument();

      // Verify the value is within the expected range (2 to CURVE_N)
      const displayValue = displayElement.getAttribute('value');
      if (displayValue) {
        const numericValue = BigInt(displayValue);
        expect(numericValue).toBeGreaterThanOrEqual(BigInt(2));
        expect(numericValue).toBeLessThan(CURVE_N);
      }
    });

    it('should set hex mode when generating random number', async () => {
      await act(async () => {
        renderWithStore(<ECCCalculator {...createDefaultProps()} />);
      });

      const randButton = screen.getByText('rand');

      await act(async () => {
        fireEvent.click(randButton);
      });

      // Check that the 0x button is active (hex mode enabled)
      const hexModeButton = screen.getByText('0x');
      expect(hexModeButton).toHaveClass('active');
    });
  });
});
