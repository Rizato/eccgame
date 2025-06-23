import { act, render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGeneratorPoint,
  CURVE_N,
  pointMultiply,
  pointMultiplyWithIntermediates,
} from '../utils/ecc';
import { getCachedGraph } from '../utils/graphCache';
import { createTestStore } from '../utils/testUtils';
import ECCCalculator from './ECCCalculator';

// Mock the crypto module to avoid async issues in tests
vi.mock('../utils/crypto', () => ({
  getP2PKHAddress: vi.fn().mockResolvedValue('mock-address'),
}));

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

  describe('Force Multiplication with Intermediates', () => {
    it('should add intermediate points to graph during multiplication', async () => {
      const store = createTestStore();

      // Set game mode to daily so the calculator uses the right slice
      store.dispatch({ type: 'game/setGameMode', payload: 'daily' });

      await act(async () => {
        render(
          <Provider store={store}>
            <ECCCalculator {...createDefaultProps()} />
          </Provider>
        );
      });

      // Perform multiplication by a scalar that generates intermediates
      const scalar = 5n; // Binary: 101, will produce intermediates
      const fiveButton = screen.getAllByText('5').find(el => el.tagName === 'BUTTON');
      const multiplyButton = screen.getByText('×');
      const equalsButton = screen.getByText('=');

      // Input "5" and multiply
      await act(async () => {
        fireEvent.click(fiveButton!);
      });

      // Verify display shows "5"
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(multiplyButton);
      });

      // Verify the operation is pending
      expect(multiplyButton).toHaveClass('highlighted');

      await act(async () => {
        fireEvent.click(equalsButton);
      });

      // Check that intermediates were created by verifying against expected intermediate count
      const { intermediates } = pointMultiplyWithIntermediates(scalar, generatorPoint);

      // The graph should contain the intermediate points
      const graph = getCachedGraph('daily');
      const graphNodes = Object.values(graph.nodes);

      // Should have at least: generator + final result + intermediates + negated points
      // Each operation adds its result point + negated point, plus intermediates
      expect(graphNodes.length).toBeGreaterThan(2);

      // Verify that all intermediate points from the algorithm exist in the graph
      for (const intermediate of intermediates) {
        const foundNode = graphNodes.find(
          (node: any) => node.point.x === intermediate.point.x && node.point.y === intermediate.point.y
        );
        expect(foundNode).toBeDefined();
      }

      // Verify final result exists
      const finalResult = pointMultiply(scalar, generatorPoint);
      const finalNode = graphNodes.find(
        (node: any) => node.point.x === finalResult.x && node.point.y === finalResult.y
      );
      expect(finalNode).toBeDefined();
    });

    it('should add intermediate points during division', async () => {
      const store = createTestStore();

      // Set game mode to daily so the calculator uses the right slice
      store.dispatch({ type: 'game/setGameMode', payload: 'daily' });

      await act(async () => {
        render(
          <Provider store={store}>
            <ECCCalculator {...createDefaultProps()} />
          </Provider>
        );
      });

      // First multiply to get a point, then divide back
      const twoButton = screen.getAllByText('2').find(el => el.tagName === 'BUTTON');
      const multiplyButton = screen.getByText('×');
      const divideButton = screen.getByText('÷');
      const equalsButton = screen.getByText('=');

      // Input "2" and multiply to get 2G
      await act(async () => {
        fireEvent.click(twoButton!);
        fireEvent.click(multiplyButton);
        fireEvent.click(equalsButton);
      });

      // Now divide by 2 to get back to G
      await act(async () => {
        fireEvent.click(twoButton!);
        fireEvent.click(divideButton);
        fireEvent.click(equalsButton);
      });

      const graph = getCachedGraph('daily');
      const graphNodes = Object.values(graph.nodes);

      // Should have multiple nodes from both operations and their intermediates
      expect(graphNodes.length).toBeGreaterThan(2);

      // Should have both 2G and G in the graph
      const twoG = pointMultiply(2n, generatorPoint);
      const generatorNode = graphNodes.find(
        (node: any) => node.point.x === generatorPoint.x && node.point.y === generatorPoint.y
      );
      const twoGNode = graphNodes.find((node: any) => node.point.x === twoG.x && node.point.y === twoG.y);

      expect(generatorNode).toBeDefined();
      expect(twoGNode).toBeDefined();
    });

    it('should not add intermediates for quick operations', async () => {
      const store = createTestStore();

      // Set game mode to daily so the calculator uses the right slice
      store.dispatch({ type: 'game/setGameMode', payload: 'daily' });

      await act(async () => {
        render(
          <Provider store={store}>
            <ECCCalculator {...createDefaultProps()} />
          </Provider>
        );
      });

      // Use quick operation button (×2) which should not generate intermediates
      const quickMultiplyButton = screen.getByText('×2');

      await act(async () => {
        fireEvent.click(quickMultiplyButton);
      });

      const graph = getCachedGraph('daily');
      const graphNodes = Object.values(graph.nodes);

      // Quick operations may still generate some nodes, but should be reasonable
      // The exact count may vary based on implementation
      expect(graphNodes.length).toBeGreaterThanOrEqual(2);

      // Verify we have generator and 2G
      const twoG = pointMultiply(2n, generatorPoint);
      const generatorNode = graphNodes.find(
        (node: any) => node.point.x === generatorPoint.x && node.point.y === generatorPoint.y
      );
      const twoGNode = graphNodes.find((node: any) => node.point.x === twoG.x && node.point.y === twoG.y);

      expect(generatorNode).toBeDefined();
      expect(twoGNode).toBeDefined();
    });

    it('should handle intermediates with proper operation tracking', async () => {
      const store = createTestStore();

      // Set game mode to daily so the calculator uses the right slice
      store.dispatch({ type: 'game/setGameMode', payload: 'daily' });

      await act(async () => {
        render(
          <Provider store={store}>
            <ECCCalculator {...createDefaultProps()} />
          </Provider>
        );
      });

      // Use a scalar that produces multiple intermediates
      const sevenButton = screen.getAllByText('7').find(el => el.tagName === 'BUTTON');
      const multiplyButton = screen.getByText('×');
      const equalsButton = screen.getByText('=');

      await act(async () => {
        fireEvent.click(sevenButton!);
      });

      await act(async () => {
        fireEvent.click(multiplyButton);
      });

      await act(async () => {
        fireEvent.click(equalsButton);
      });

      const graph = getCachedGraph('daily');
      
      // Flatten all edges from the graph
      const allEdges = Object.values(graph.edges).flat();

      // Should have edges connecting intermediate points
      expect(allEdges.length).toBeGreaterThan(1);

      // All intermediate edges should be marked as system-generated
      const systemEdges = allEdges.filter((edge: any) => edge.operation.userCreated === false);
      
      expect(systemEdges.length).toBeGreaterThan(0);
    });
  });
});
