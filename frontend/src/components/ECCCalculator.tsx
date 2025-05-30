import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ECPoint } from '../utils/ecc';
import {
  pointAdd,
  pointSubtract,
  pointMultiply,
  pointDivide,
  CURVE_N,
  bigintToHex,
  hexToBigint,
  isPointOnCurve,
  getGeneratorPoint,
  pointToPublicKey,
} from '../utils/ecc';
import { getP2PKHAddress } from '../utils/crypto';
import './ECCCalculator.css';

interface ECCCalculatorProps {
  currentPoint: ECPoint;
  onPointChange: (point: ECPoint, operation: Operation) => void;
  onError: (error: string | null) => void;
  onShowPointModal: () => void;
  onResetPoint: () => void;
  isPracticeMode?: boolean;
  practicePrivateKey?: string;
  progress?: number | null;
}

export interface Operation {
  id: string;
  type: 'multiply' | 'divide' | 'add' | 'subtract';
  description: string;
  value?: string;
  point?: ECPoint;
}

const ECCCalculator: React.FC<ECCCalculatorProps> = ({
  currentPoint,
  onPointChange,
  onError,
  onShowPointModal,
  onResetPoint,
  isPracticeMode = false,
  practicePrivateKey,
  progress,
}) => {
  const [calculatorDisplay, setCalculatorDisplay] = useState('');
  const [pendingOperation, setPendingOperation] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [lastOperationValue, setLastOperationValue] = useState<string | null>(null);
  const [operatorHighlighted, setOperatorHighlighted] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [hexMode, setHexMode] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  const generatorPoint = getGeneratorPoint();

  // Calculate current address asynchronously
  useEffect(() => {
    const calculateAddress = async () => {
      if (currentPoint.isInfinity) {
        setCurrentAddress('Point at Infinity');
        return;
      }

      try {
        const pubKey = pointToPublicKey(currentPoint);
        const address = await getP2PKHAddress(pubKey);
        setCurrentAddress(address);
      } catch {
        setCurrentAddress('Invalid');
      }
    };

    calculateAddress();
  }, [currentPoint]);

  // Calculator functions
  const clearCalculator = useCallback(() => {
    setCalculatorDisplay('');
    setPendingOperation(null);
    setOperatorHighlighted(null);
    setHexMode(false);
  }, []);

  const toggleHexMode = useCallback(() => {
    setCalculatorDisplay(prev => {
      if (prev.startsWith('0x')) {
        // Check if there are hex letters (A-F) in the value
        const valueAfterPrefix = prev.slice(2);
        const hasHexLetters = /[A-Fa-f]/.test(valueAfterPrefix);

        if (hasHexLetters) {
          // Don't allow removing 0x if there are hex letters
          return prev;
        }

        // Remove 0x prefix only if no hex letters
        setHexMode(false);
        return valueAfterPrefix;
      } else {
        // Add 0x prefix
        setHexMode(true);
        return '0x' + prev;
      }
    });
  }, []);

  const addToCalculator = useCallback((value: string) => {
    // Check if this is a hex digit (A-F)
    const isHexDigit = /^[A-F]$/i.test(value);

    setCalculatorDisplay(prev => {
      const newValue = prev + value;

      // Auto-enable hex mode if we're adding hex digits
      if (isHexDigit && !prev.startsWith('0x')) {
        setHexMode(true);
        return '0x' + newValue;
      }

      return newValue;
    });
  }, []);

  const backspaceCalculator = useCallback(() => {
    setCalculatorDisplay(prev => {
      const newValue = prev.slice(0, -1);

      // If we removed the last character after 0x, remove the 0x too
      if (newValue === '0x') {
        setHexMode(false);
        return '';
      }

      // Update hex mode state based on current value
      if (!newValue.startsWith('0x') && hexMode) {
        setHexMode(false);
      } else if (newValue.startsWith('0x') && !hexMode) {
        setHexMode(true);
      }

      return newValue;
    });
  }, [hexMode]);

  // Forward declare the executeCalculatorOperation function reference
  const executeCalculatorOperationRef = useRef<
    ((operation: 'multiply' | 'divide' | 'add' | 'subtract', value: string) => void) | null
  >(null);

  const setCalculatorOperation = useCallback(
    (operation: 'multiply' | 'divide' | 'add' | 'subtract') => {
      // If there's a value in the display and we haven't set a pending operation yet
      if (calculatorDisplay.trim() && !pendingOperation) {
        // Set pending operation and highlight the operator, wait for equals
        setPendingOperation(operation);
        setOperatorHighlighted(operation);
      } else if (calculatorDisplay.trim() && pendingOperation) {
        // If there's already a pending operation, execute it with current display value
        executeCalculatorOperationRef.current?.(pendingOperation, calculatorDisplay.trim());
        // Then set the new operation as pending
        setPendingOperation(operation);
        setOperatorHighlighted(operation);
      } else if (lastOperationValue) {
        // If no value but we have a last operation value, reuse it
        executeCalculatorOperationRef.current?.(operation, lastOperationValue);
      } else {
        // Just set the pending operation and highlight
        setPendingOperation(operation);
        setOperatorHighlighted(operation);
      }
    },
    [calculatorDisplay, pendingOperation, lastOperationValue]
  );

  // Quick operation functions
  const quickAddG = useCallback(() => {
    try {
      onError(null);
      const newPoint = pointAdd(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        id: `op_${Date.now()}`,
        type: 'add',
        description: '+G',
        point: generatorPoint,
      };
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint, onPointChange, onError]);

  const quickSubtractG = useCallback(() => {
    try {
      onError(null);
      const newPoint = pointSubtract(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        id: `op_${Date.now()}`,
        type: 'subtract',
        description: '-G',
        point: generatorPoint,
      };
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint, onPointChange, onError]);

  const quickDouble = useCallback(() => {
    try {
      onError(null);
      const newPoint = pointMultiply(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        id: `op_${Date.now()}`,
        type: 'multiply',
        description: '×2',
        value: '2',
      };
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, onPointChange, onError]);

  const quickHalve = useCallback(() => {
    try {
      onError(null);
      const newPoint = pointDivide(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        id: `op_${Date.now()}`,
        type: 'divide',
        description: '÷2',
        value: '2',
      };
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, onPointChange, onError]);

  const executeCalculatorOperation = useCallback(
    (operation: 'multiply' | 'divide' | 'add' | 'subtract', value: string) => {
      try {
        onError(null);

        if (operation === 'multiply' || operation === 'divide') {
          // For scalar operations
          if (!value.trim()) {
            onError('Please enter a scalar value');
            return;
          }

          let scalar: bigint;
          try {
            if (value.startsWith('0x')) {
              scalar = hexToBigint(value);
            } else if (value.includes('.')) {
              onError('Decimal numbers not supported. Use integers or hex values.');
              return;
            } else {
              scalar = BigInt(value);
            }
          } catch {
            onError('Invalid scalar value');
            return;
          }

          if (scalar <= 0n) {
            onError('Scalar must be positive');
            return;
          }

          if (scalar >= CURVE_N) {
            onError('Scalar too large for secp256k1 curve');
            return;
          }

          let newPoint: ECPoint;
          let description: string;

          if (operation === 'multiply') {
            newPoint = pointMultiply(scalar, currentPoint);
            description = `×${value}`;
          } else {
            newPoint = pointDivide(scalar, currentPoint);
            description = `÷${value}`;
          }

          if (!isPointOnCurve(newPoint)) {
            onError('Result is not on the curve');
            return;
          }

          const operationObj: Operation = {
            id: `op_${Date.now()}`,
            type: operation,
            description,
            value,
          };
          onPointChange(newPoint, operationObj);

          // Store the value for potential chaining
          setLastOperationValue(value);
        } else {
          // For point operations (+G, -G), execute directly
          if (operation === 'add') {
            quickAddG();
          } else {
            quickSubtractG();
          }
          // Store 'G' as the operation value for chaining
          setLastOperationValue('G');
          // For point operations, we can still keep the operation for chaining
          // The user can press the same operator again to repeat +G or -G operations
        }

        // Keep the value in display for chaining, keep the operation selected for repeated equals
        setCalculatorDisplay(value);
        // Keep pending operation and highlighted state for chaining equals
      } catch (error) {
        onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [currentPoint, onPointChange, onError, quickAddG, quickSubtractG]
  );

  // Assign the function to the ref so it can be called from setCalculatorOperation
  executeCalculatorOperationRef.current = executeCalculatorOperation;

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input field (except our calculator)
      if (
        event.target instanceof HTMLInputElement &&
        !event.target.classList.contains('calculator-input')
      ) {
        return;
      }

      // Prevent default for keys we handle
      const key = event.key;

      // Numbers 0-9
      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        addToCalculator(key);
        return;
      }

      // Hex letters A-F
      if (/^[A-Fa-f]$/.test(key)) {
        event.preventDefault();
        addToCalculator(key.toUpperCase());
        return;
      }

      // Operators
      switch (key) {
        case '*':
        case 'x':
        case 'X':
          event.preventDefault();
          setCalculatorOperation('multiply');
          break;
        case '/':
          event.preventDefault();
          setCalculatorOperation('divide');
          break;
        case '+':
          event.preventDefault();
          setCalculatorOperation('add');
          break;
        case '-':
          event.preventDefault();
          setCalculatorOperation('subtract');
          break;
        case 'Enter':
        case '=':
          event.preventDefault();
          if (pendingOperation && calculatorDisplay.trim()) {
            executeCalculatorOperationRef.current?.(pendingOperation, calculatorDisplay.trim());
          } else if (lastOperationValue && pendingOperation) {
            executeCalculatorOperationRef.current?.(pendingOperation, lastOperationValue);
          }
          break;
        case 'Backspace':
          event.preventDefault();
          backspaceCalculator();
          break;
        case 'Escape':
        case 'c':
        case 'C':
          event.preventDefault();
          clearCalculator();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [
    addToCalculator,
    setCalculatorOperation,
    backspaceCalculator,
    clearCalculator,
    pendingOperation,
    calculatorDisplay,
    lastOperationValue,
  ]);

  return (
    <div className="calculator-section">
      {/* Current Point Display in Calculator */}
      <div className="calculator-point-display">
        <div className="point-display-header">
          <h5>Current Point</h5>
          <div className="point-display-actions">
            <button onClick={onResetPoint} className="reset-point-button">
              Reset
            </button>
          </div>
        </div>
        <div className="point-display-content">
          {currentPoint.isInfinity ? (
            <span className="point-status">Point at Infinity (O)</span>
          ) : (
            <>
              <div className="point-address">{currentAddress}</div>
              {isPracticeMode && practicePrivateKey && (
                <div className="point-progress">Progress: {progress?.toFixed(1)}%</div>
              )}
              <div className="point-coordinates-compact">
                <span>x: {bigintToHex(currentPoint.x).slice(0, 16)}...</span>
                <span>y: {bigintToHex(currentPoint.y).slice(0, 16)}...</span>
              </div>
              <div className="point-compressed-key">
                <span>Compressed: {pointToPublicKey(currentPoint).slice(0, 16)}...</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="calculator-container">
        <div className="calculator-display">
          <input
            type="text"
            value={calculatorDisplay}
            placeholder="0"
            className="calculator-input"
            readOnly
          />
        </div>
        <div className="calculator-buttons">
          <div className="calculator-main-grid">
            <div className="number-section">
              <div className="button-row top-row">
                <button onClick={clearCalculator} className="calc-button clear">
                  C
                </button>
                <button onClick={quickAddG} className="calc-button quick-op add">
                  +G
                </button>
                <button onClick={quickSubtractG} className="calc-button quick-op subtract">
                  -G
                </button>
                <button onClick={quickDouble} className="calc-button quick-op multiply">
                  ×2
                </button>
                <button onClick={quickHalve} className="calc-button quick-op divide">
                  ÷2
                </button>
              </div>
              <div className="button-row">
                <button onClick={() => addToCalculator('7')} className="calc-button number">
                  7
                </button>
                <button onClick={() => addToCalculator('8')} className="calc-button number">
                  8
                </button>
                <button onClick={() => addToCalculator('9')} className="calc-button number">
                  9
                </button>
                <button onClick={() => addToCalculator('A')} className="calc-button hex">
                  A
                </button>
                <button onClick={() => addToCalculator('B')} className="calc-button hex">
                  B
                </button>
              </div>
              <div className="button-row">
                <button onClick={() => addToCalculator('4')} className="calc-button number">
                  4
                </button>
                <button onClick={() => addToCalculator('5')} className="calc-button number">
                  5
                </button>
                <button onClick={() => addToCalculator('6')} className="calc-button number">
                  6
                </button>
                <button onClick={() => addToCalculator('C')} className="calc-button hex">
                  C
                </button>
                <button onClick={() => addToCalculator('D')} className="calc-button hex">
                  D
                </button>
              </div>
              <div className="button-row">
                <button onClick={() => addToCalculator('1')} className="calc-button number">
                  1
                </button>
                <button onClick={() => addToCalculator('2')} className="calc-button number">
                  2
                </button>
                <button onClick={() => addToCalculator('3')} className="calc-button number">
                  3
                </button>
                <button onClick={() => addToCalculator('E')} className="calc-button hex">
                  E
                </button>
                <button onClick={() => addToCalculator('F')} className="calc-button hex">
                  F
                </button>
              </div>
              <div className="button-row">
                <button onClick={() => addToCalculator('0')} className="calc-button number">
                  0
                </button>
                <button
                  onClick={toggleHexMode}
                  className={`calc-button hex special ${hexMode ? 'active' : ''}`}
                >
                  0x
                </button>
                <button className="calc-button spacer"></button>
                <button className="calc-button spacer"></button>
                <button className="calc-button spacer"></button>
              </div>
            </div>
            <div className="operations-column">
              <button onClick={backspaceCalculator} className="calc-button backspace">
                ⌫
              </button>
              <div className="operators-grid">
                <button
                  onClick={() => setCalculatorOperation('divide')}
                  className={`calc-button operator ${operatorHighlighted === 'divide' ? 'highlighted' : ''}`}
                >
                  ÷
                </button>
                <button
                  onClick={() => setCalculatorOperation('multiply')}
                  className={`calc-button operator ${operatorHighlighted === 'multiply' ? 'highlighted' : ''}`}
                >
                  ×
                </button>
                <button
                  onClick={() => setCalculatorOperation('subtract')}
                  className={`calc-button operator ${operatorHighlighted === 'subtract' ? 'highlighted' : ''}`}
                >
                  -
                </button>
                <button
                  onClick={() => setCalculatorOperation('add')}
                  className={`calc-button operator ${operatorHighlighted === 'add' ? 'highlighted' : ''}`}
                >
                  +
                </button>
              </div>
              <button
                onClick={() => {
                  if (pendingOperation && calculatorDisplay.trim()) {
                    executeCalculatorOperationRef.current?.(
                      pendingOperation,
                      calculatorDisplay.trim()
                    );
                  } else if (lastOperationValue && pendingOperation) {
                    executeCalculatorOperationRef.current?.(pendingOperation, lastOperationValue);
                  }
                }}
                className="calc-button equals equals-square"
              >
                =
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="operation-help">
        <small>
          Use keyboard (0-9, A-F, +, -, *, /, Enter, Escape) or click buttons. Operations act on the
          current point above.
        </small>
      </div>
    </div>
  );
};

export default ECCCalculator;
