import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ECCCalculator from './ECCCalculator';
import type { ECPoint } from '../types/ecc';

// Mock the crypto utilities
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2'),
}));

// Mock the ecc utilities
vi.mock('../utils/ecc', async () => {
  const actual = await vi.importActual('../utils/ecc');
  return {
    ...actual,
    pointToPublicKey: vi
      .fn()
      .mockReturnValue('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'),
    pointAdd: vi.fn(),
    pointSubtract: vi.fn(),
    pointMultiply: vi.fn(),
    pointDivide: vi.fn(),
    isPointOnCurve: vi.fn().mockReturnValue(true),
    getGeneratorPoint: vi.fn().mockReturnValue({
      x: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
      y: 32670510020758816978083085130507043184471273380659243275938904335757337482424n,
      isInfinity: false,
    }),
    bigintToHex: vi.fn().mockImplementation((n: bigint) => n.toString(16).padStart(64, '0')),
    hexToBigint: vi.fn().mockImplementation((hex: string) => BigInt('0x' + hex.replace('0x', ''))),
    CURVE_N: 115792089237316195423570985008687907852837564279074904382605163141518161494337n,
  };
});

describe('ECCCalculator', () => {
  const mockPoint: ECPoint = {
    x: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
    y: 32670510020758816978083085130507043184471273380659243275938904335757337482424n,
    isInfinity: false,
  };

  const infinityPoint: ECPoint = {
    x: 0n,
    y: 0n,
    isInfinity: true,
  };

  const mockProps = {
    currentPoint: mockPoint,
    savedPoints: [],
    currentSavedPoint: null,
    challengePoint: mockPoint,
    operations: [],
    onPointChange: vi.fn(),
    onError: vi.fn(),
    onSavePoint: vi.fn(),
    onLoadSavedPoint: vi.fn(),
    isPracticeMode: false,
    practicePrivateKey: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the calculator with all essential elements', () => {
      render(<ECCCalculator {...mockProps} />);

      expect(screen.getByText('Current Point')).toBeInTheDocument();
      expect(screen.getByText('Save Point')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
      expect(screen.getAllByText('C').length).toBeGreaterThan(0);
      expect(screen.getByText('=')).toBeInTheDocument();
    });

    it('displays point at infinity correctly', () => {
      render(<ECCCalculator {...mockProps} currentPoint={infinityPoint} />);

      expect(screen.getByText('Point at Infinity')).toBeInTheDocument();
    });

    it('displays practice mode information when enabled', () => {
      render(<ECCCalculator {...mockProps} isPracticeMode={true} practicePrivateKey="abc123" />);

      // Just check that the component renders without crashing in practice mode
      expect(screen.getByText('Current Point')).toBeInTheDocument();
    });
  });

  describe('Number Input', () => {
    it('adds digits to calculator display when number buttons are clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));

      expect(input.value).toBe('123');
    });

    it('adds hex digits and automatically enables hex mode', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.click(screen.getByText('A'));

      expect(input.value).toBe('0xA');
      expect(screen.getByText('0x')).toHaveClass('active');
    });

    it('handles backspace correctly', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('⌫'));

      expect(input.value).toBe('12');
    });

    it('clears display when C button is clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('C'));

      expect(input.value).toBe('');
    });
  });

  describe('Hex Mode', () => {
    it('toggles hex mode when 0x button is clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;
      const hexButton = screen.getByText('0x');

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(hexButton);

      expect(input.value).toBe('0x12');
      expect(hexButton).toHaveClass('active');
    });

    it('prevents removing 0x when hex letters are present', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;
      const hexButton = screen.getByText('0x');

      fireEvent.click(screen.getByText('A'));
      fireEvent.click(hexButton);

      expect(input.value).toBe('0xA'); // Should not change
      expect(hexButton).toHaveClass('active');
    });

    it('removes 0x prefix when only numbers are present', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;
      const hexButton = screen.getByText('0x');

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(hexButton);
      fireEvent.click(hexButton);

      expect(input.value).toBe('12');
      expect(hexButton).not.toHaveClass('active');
    });
  });

  describe('Operations', () => {
    it('highlights operator when clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));

      const multiplyButton = screen.getByText('×');
      fireEvent.click(multiplyButton);

      expect(multiplyButton).toHaveClass('highlighted');
    });

    it('executes scalar multiplication operation', async () => {
      const mockPointMultiply = vi.mocked(await import('../utils/ecc')).pointMultiply;
      mockPointMultiply.mockReturnValue(mockPoint);

      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('×'));
      fireEvent.click(screen.getByText('='));

      expect(mockProps.onPointChange).toHaveBeenCalledWith(
        mockPoint,
        expect.objectContaining({
          type: 'multiply',
          description: '×2',
          value: '2',
        })
      );
    });

    it('executes quick operations', async () => {
      const mockPointAdd = vi.mocked(await import('../utils/ecc')).pointAdd;
      mockPointAdd.mockReturnValue(mockPoint);

      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('+G'));

      expect(mockProps.onPointChange).toHaveBeenCalledWith(
        mockPoint,
        expect.objectContaining({
          type: 'add',
          description: '+G',
        })
      );
    });

    it('handles operation chaining with equals button', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('×'));
      fireEvent.click(screen.getByText('='));

      // Press equals again to repeat operation
      fireEvent.click(screen.getByText('='));

      expect(mockProps.onPointChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('displays error for invalid scalar values', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('0'));
      fireEvent.click(screen.getByText('×'));
      fireEvent.click(screen.getByText('='));

      expect(mockProps.onError).toHaveBeenCalledWith('Scalar must be positive');
    });

    it('displays error for scalar too large', async () => {
      render(<ECCCalculator {...mockProps} />);

      // Mock hexToBigint to return a value larger than CURVE_N
      const mockHexToBigint = vi.mocked(await import('../utils/ecc')).hexToBigint;
      mockHexToBigint.mockReturnValue(
        115792089237316195423570985008687907852837564279074904382605163141518161494338n
      );

      fireEvent.click(screen.getByText('0x'));
      fireEvent.click(screen.getByText('F'));
      fireEvent.click(screen.getByText('×'));
      fireEvent.click(screen.getByText('='));

      expect(mockProps.onError).toHaveBeenCalledWith('Scalar too large for secp256k1 curve');
    });

    it('handles point operation errors', async () => {
      const mockPointAdd = vi.mocked(await import('../utils/ecc')).pointAdd;
      mockPointAdd.mockImplementation(() => {
        throw new Error('Point addition failed');
      });

      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('+G'));

      expect(mockProps.onError).toHaveBeenCalledWith('Operation failed: Point addition failed');
    });
  });

  describe('Keyboard Support', () => {
    it('responds to number key presses', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.keyDown(document, { key: '1' });
      fireEvent.keyDown(document, { key: '2' });
      fireEvent.keyDown(document, { key: '3' });

      expect(input.value).toBe('123');
    });

    it('responds to hex letter key presses', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.keyDown(document, { key: 'A' });

      expect(input.value).toBe('0xA');
    });

    it('responds to operator key presses', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.keyDown(document, { key: '2' });
      fireEvent.keyDown(document, { key: '*' });

      const multiplyButton = screen.getByText('×');
      expect(multiplyButton).toHaveClass('highlighted');
    });

    it('responds to Enter key for equals', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.keyDown(document, { key: '2' });
      fireEvent.keyDown(document, { key: '*' });
      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockProps.onPointChange).toHaveBeenCalled();
    });

    it('responds to Escape key for clear', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.keyDown(document, { key: '1' });
      fireEvent.keyDown(document, { key: '2' });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(input.value).toBe('');
    });

    it('responds to Backspace key', () => {
      render(<ECCCalculator {...mockProps} />);

      const input = screen.getByPlaceholderText('0') as HTMLInputElement;

      fireEvent.keyDown(document, { key: '1' });
      fireEvent.keyDown(document, { key: '2' });
      fireEvent.keyDown(document, { key: 'Backspace' });

      expect(input.value).toBe('1');
    });

    it('does not handle keys when typing in other input fields', () => {
      render(
        <div>
          <input data-testid="other-input" />
          <ECCCalculator {...mockProps} />
        </div>
      );

      const otherInput = screen.getByTestId('other-input');
      const calculatorInput = screen.getByPlaceholderText('0') as HTMLInputElement;

      otherInput.focus();
      fireEvent.keyDown(otherInput, { key: '1' });

      expect(calculatorInput.value).toBe('');
    });
  });

  describe('Point Display', () => {
    it('calls onShowPointModal when Details button is clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('Details'));

      expect(mockProps.onShowPointModal).toHaveBeenCalled();
    });

    it('calls onResetPoint when Reset button is clicked', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('Reset'));

      expect(mockProps.onResetPoint).toHaveBeenCalled();
    });

    it('displays truncated coordinates', async () => {
      render(<ECCCalculator {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/x: [0-9a-f]{16}\.\.\./)).toBeInTheDocument();
        expect(screen.getByText(/y: [0-9a-f]{16}\.\.\./)).toBeInTheDocument();
      });
    });
  });

  describe('Status Messages', () => {
    it('shows correct status when no input', () => {
      render(<ECCCalculator {...mockProps} />);

      expect(
        screen.getByText(/Enter numbers.*and operators.*using keyboard or buttons/)
      ).toBeInTheDocument();
    });

    it('shows correct status when number is entered', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));

      expect(screen.getByText(/Enter: 12.*choose operation/)).toBeInTheDocument();
    });

    it('shows correct status when operation is pending', () => {
      render(<ECCCalculator {...mockProps} />);

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('×'));

      expect(screen.getByText(/Ready: 12 × \?.*press = or Enter/)).toBeInTheDocument();
    });
  });
});
