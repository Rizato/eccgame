import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ECCCalculator.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { getCachedGraph } from '../utils/graphCache';
import {
  addBatchOperationsToGraph as addDailyBatchOperations,
  addOperationToGraph as addDailyOperationToGraph,
} from '../store/slices/eccCalculatorSlice';
import {
  addBatchOperationsToGraph as addPracticeBatchOperations,
  addOperationToGraph as addPracticeOperationToGraph,
} from '../store/slices/practiceCalculatorSlice';
import { togglePrivateKeyDisplayMode } from '../store/slices/uiSlice';
import {
  type ECPoint,
  type IntermediatePoint,
  type Operation,
  OperationType,
} from '../types/ecc.ts';
import { getP2PKHAddress } from '../utils/crypto';
import {
  bigintToHex,
  CURVE_N,
  getGeneratorPoint,
  hexToBigint,
  isPointOnCurve,
  pointAdd,
  pointDivide,
  pointDivideWithIntermediates,
  pointMultiply,
  pointMultiplyWithIntermediates,
  pointNegate,
  pointSubtract,
  pointToPublicKey,
  publicKeyToPoint,
} from '../utils/ecc';
import { calculatePrivateKeyFromGraph } from '../utils/graphOperations.ts';
import { SavePointModal } from './SavePointModal';

interface ECCCalculatorProps {
  currentPoint: ECPoint;
  challengePublicKey: string; // Challenge public key for private key calculations
  onPointChange: (point: ECPoint, operation: Operation) => void;
  onError: (error: string | null) => void;
  onSavePoint: (label?: string) => void;
  isLocked?: boolean;
  calculatorDisplayRef?: React.MutableRefObject<((value: string) => void) | null>;
}

const ECCCalculator: React.FC<ECCCalculatorProps> = ({
  currentPoint,
  challengePublicKey,
  onPointChange,
  onError,
  onSavePoint,
  isLocked = false,
  calculatorDisplayRef,
}) => {
  const gameMode = useAppSelector(state => state.game.gameMode);
  const { savedPoints } = useAppSelector(state =>
    gameMode === 'practice' ? state.practiceCalculator : state.dailyCalculator
  );
  const graph = getCachedGraph(gameMode === 'practice' ? 'practice' : 'daily');
  const dispatch = useAppDispatch();

  // Create stable dispatch function to avoid circular dependencies
  const dispatchOperation = useCallback(
    (operation: Parameters<typeof addDailyOperationToGraph>[0]) => {
      if (gameMode === 'practice') {
        dispatch(addPracticeOperationToGraph(operation));
      } else {
        dispatch(addDailyOperationToGraph(operation));
      }
    },
    [dispatch, gameMode]
  );

  const dispatchBatchOperations = useCallback(
    (operations: Parameters<typeof addDailyBatchOperations>[0]) => {
      if (gameMode === 'practice') {
        dispatch(addPracticeBatchOperations(operations));
      } else {
        dispatch(addDailyBatchOperations(operations));
      }
    },
    [dispatch, gameMode]
  );

  const [calculatorDisplay, setCalculatorDisplay] = useState('');
  const [pendingOperation, setPendingOperation] = useState<OperationType | null>(null);
  const [lastOperationType, setLastOperationType] = useState<OperationType | null>(null);
  const [hexMode, setHexMode] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const privateKeyDisplayMode = useAppSelector(state => state.ui.privateKeyDisplayMode);
  const privateKeyHexMode = privateKeyDisplayMode === 'hex';
  const [showSaveModal, setShowSaveModal] = useState(false);

  const generatorPoint = getGeneratorPoint();

  // Check if current point is at a base point (generator or challenge)
  const isAtBasePoint = useMemo(() => {
    if (currentPoint.isInfinity) return false;

    const isAtGenerator =
      currentPoint.x === generatorPoint.x && currentPoint.y === generatorPoint.y;

    if (!challengePublicKey) return isAtGenerator;

    try {
      const challengePoint = publicKeyToPoint(challengePublicKey);
      const isAtChallenge =
        currentPoint.x === challengePoint.x && currentPoint.y === challengePoint.y;
      return isAtGenerator || isAtChallenge;
    } catch {
      return isAtGenerator;
    }
  }, [currentPoint, generatorPoint, challengePublicKey]);

  // Calculate the actual private key for the current point using the graph
  const currentPrivateKey = useMemo(() => {
    return calculatePrivateKeyFromGraph(currentPoint, graph);
  }, [currentPoint, graph]);

  // Check if current point is already saved
  const currentPointSavedInfo = useMemo(() => {
    if (currentPoint.isInfinity) return null;

    return savedPoints.find(
      saved =>
        !saved.point.isInfinity &&
        saved.point.x === currentPoint.x &&
        saved.point.y === currentPoint.y
    );
  }, [currentPoint, savedPoints]);

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
    setLastOperationType(null);
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

  const addToCalculator = useCallback(
    (value: string) => {
      if (isLocked) return;
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
    },
    [isLocked]
  );

  const backspaceCalculator = useCallback(() => {
    if (isLocked) return;
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
  }, [hexMode, isLocked]);

  // Forward declare the executeCalculatorOperation function reference
  const executeCalculatorOperationRef = useRef<
    ((operation: OperationType, value: string) => void) | null
  >(null);

  const setCalculatorOperation = useCallback(
    (operation: OperationType) => {
      if (isLocked) return;

      // If there's a value in the display, set pending operation
      if (calculatorDisplay.trim()) {
        // If same operator is clicked, and it's already highlighted, then repeat the operation
        if (lastOperationType === operation && pendingOperation === operation) {
          executeCalculatorOperationRef.current?.(operation, calculatorDisplay.trim());
        }
        setPendingOperation(operation);
      } else {
        // Set the pending operation to highlight the operator
        setPendingOperation(operation);
      }
    },
    [calculatorDisplay, pendingOperation, lastOperationType, isLocked]
  );

  // Quick operation functions
  const quickAddG = useCallback(() => {
    if (isLocked) return;
    try {
      onError(null);
      const newPoint = pointAdd(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        type: OperationType.ADD,
        description: '+G',
        value: '1',
        userCreated: true,
      };

      // Add to graph through Redux
      dispatchOperation({
        fromPoint: currentPoint,
        toPoint: newPoint,
        operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint, dispatchOperation, onPointChange, onError, isLocked]);

  const quickSubtractG = useCallback(() => {
    if (isLocked) return;
    try {
      onError(null);
      const newPoint = pointSubtract(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        type: OperationType.SUBTRACT,
        description: '-G',
        value: '1',
        userCreated: true,
      };

      // Add to graph through Redux
      dispatchOperation({
        fromPoint: currentPoint,
        toPoint: newPoint,
        operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint, dispatchOperation, onPointChange, onError, isLocked]);

  const quickDouble = useCallback(() => {
    if (isLocked) return;
    try {
      onError(null);
      const newPoint = pointMultiply(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        type: OperationType.MULTIPLY,
        description: '×2',
        value: '2',
        userCreated: true,
      };

      // Add to graph through Redux
      dispatchOperation({
        fromPoint: currentPoint,
        toPoint: newPoint,
        operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, dispatchOperation, onPointChange, onError, isLocked]);

  const quickHalve = useCallback(() => {
    if (isLocked) return;
    try {
      onError(null);
      const newPoint = pointDivide(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        type: OperationType.DIVIDE,
        description: '÷2',
        value: '2',
        userCreated: true,
      };

      // Add to graph through Redux
      dispatchOperation({
        fromPoint: currentPoint,
        toPoint: newPoint,
        operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, dispatchOperation, onPointChange, onError, isLocked]);

  const quickNegate = useCallback(() => {
    if (isLocked) return;
    try {
      onError(null);
      const newPoint = pointNegate(currentPoint);
      if (!isPointOnCurve(newPoint)) {
        onError('Result is not on the curve');
        return;
      }
      const operation: Operation = {
        type: OperationType.NEGATE,
        description: '±',
        value: '',
        userCreated: true,
      };

      // Add to graph through Redux
      dispatchOperation({
        fromPoint: currentPoint,
        toPoint: newPoint,
        operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
    } catch (error) {
      onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, dispatchOperation, onPointChange, onError, isLocked]);

  // Go Here function - jumps directly to G × scalar
  const goHere = useCallback(() => {
    if (isLocked || !calculatorDisplay) return;
    try {
      onError(null);

      let scalar: bigint;
      try {
        const value = calculatorDisplay.trim();
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
        scalar %= CURVE_N;
      }

      const newPoint = pointMultiply(scalar, generatorPoint);
      const operation: Operation = {
        type: OperationType.MULTIPLY,
        description: `→ G×${calculatorDisplay}`,
        value: calculatorDisplay,
        userCreated: true,
      };

      // For go here, we're going from G to the new point, so the fromPoint should be G
      // This ensures the new node gets the correct private key (scalar) and is connected to G
      dispatchOperation({
        fromPoint: generatorPoint,
        toPoint: newPoint,
        operation: operation,
      });

      // Also notify parent for any UI updates
      onPointChange(newPoint, operation);
      clearCalculator();
    } catch (error) {
      onError(`Go here failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [
    calculatorDisplay,
    isLocked,
    generatorPoint,
    dispatchOperation,
    onPointChange,
    onError,
    clearCalculator,
  ]);

  const executeCalculatorOperation = useCallback(
    (operation: OperationType, value: string) => {
      if (isLocked) return;
      try {
        onError(null);

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
          scalar %= CURVE_N;
        }

        let newPoint: ECPoint;
        let steps: IntermediatePoint[] = [];
        let description: string;

        const differencePoint = pointMultiply(scalar, generatorPoint);
        if (operation === OperationType.MULTIPLY) {
          const { result, intermediates } = pointMultiplyWithIntermediates(
            scalar,
            currentPoint,
            currentPrivateKey
          );
          newPoint = result;
          steps = intermediates;
          description = `×${value}`;
        } else if (operation === OperationType.DIVIDE) {
          const { result, intermediates } = pointDivideWithIntermediates(
            scalar,
            currentPoint,
            currentPrivateKey
          );
          newPoint = result;
          steps = intermediates;
          description = `÷${value}`;
        } else if (operation === OperationType.ADD) {
          newPoint = pointAdd(currentPoint, differencePoint);
          description = `+${value}`;
        } else {
          newPoint = pointSubtract(currentPoint, differencePoint);
          description = `-${value}`;
        }

        if (!isPointOnCurve(newPoint)) {
          onError('Result is not on the curve');
          return;
        }

        const operationObj: Operation = {
          type: operation,
          description,
          value,
          userCreated: true,
        };

        // Add to graph through Redux - use batch operation for intermediates
        if (steps.length > 0) {
          // For operations with many intermediate steps, use batch dispatch
          const batchOps = [];

          // Add all intermediate operations
          let previousPoint = currentPoint;
          for (const intermediate of steps) {
            if (!isPointOnCurve(intermediate.point)) {
              onError('Intermediate point is not on the curve');
              break;
            }
            batchOps.push({
              fromPoint: previousPoint,
              toPoint: intermediate.point,
              operation: intermediate.operation,
              toPointPrivateKey: intermediate.privateKey,
            });
            previousPoint = intermediate.point;
          }

          // Dispatch all operations as a batch
          dispatchBatchOperations(batchOps);
        }

        // Single operation, dispatch after batch so they all get propagate (only once though)
        dispatchOperation({
          fromPoint: currentPoint,
          toPoint: newPoint,
          operation: operationObj,
        });
        onPointChange(newPoint, operationObj);
        // Keep the value in display for potential chaining
        setCalculatorDisplay(value);
        setLastOperationType(operation);
        // Keep the operation highlighted so user can see what was just executed
        setPendingOperation(operation);
      } catch (error) {
        onError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [
      currentPoint,
      dispatchOperation,
      dispatchBatchOperations,
      onPointChange,
      onError,
      isLocked,
      generatorPoint,
    ]
  );

  // Assign the function to the ref so it can be called from setCalculatorOperation
  executeCalculatorOperationRef.current = executeCalculatorOperation;

  // Expose calculator display setter to parent
  useEffect(() => {
    if (calculatorDisplayRef) {
      calculatorDisplayRef.current = (value: string) => {
        clearCalculator();
        setCalculatorDisplay(value);
      };
    }
  }, [calculatorDisplayRef, clearCalculator]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input field (except our calculator)
      if (
        event.ctrlKey ||
        (event.target instanceof HTMLInputElement &&
          !event.target.classList.contains('calculator-input'))
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
          setCalculatorOperation(OperationType.MULTIPLY);
          break;
        case '/':
          event.preventDefault();
          setCalculatorOperation(OperationType.DIVIDE);
          break;
        case '+':
          event.preventDefault();
          setCalculatorOperation(OperationType.ADD);
          break;
        case '-':
          event.preventDefault();
          setCalculatorOperation(OperationType.SUBTRACT);
          break;
        case 'Enter':
        case '=':
          event.preventDefault();
          if (pendingOperation && calculatorDisplay.trim()) {
            executeCalculatorOperationRef.current?.(pendingOperation, calculatorDisplay.trim());
          }
          break;
        case 'Backspace':
          event.preventDefault();
          backspaceCalculator();
          break;
        case 'Escape':
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
  ]);

  return (
    <div className={`calculator-section ${isLocked ? 'locked' : ''}`}>
      {/* Current Point Display in Calculator */}
      <div className="calculator-point-display">
        <div className="point-display-header">
          <div className="point-address">{currentAddress}</div>
          <div className="point-display-actions">
            <button
              onClick={() => {
                if (currentPointSavedInfo) {
                  // Unsave the point
                  if (gameMode === 'practice') {
                    dispatch({
                      type: 'practiceCalculator/unsaveSavedPoint',
                      payload: currentPointSavedInfo.id,
                    });
                  } else {
                    dispatch({
                      type: 'dailyCalculator/unsaveSavedPoint',
                      payload: currentPointSavedInfo.id,
                    });
                  }
                } else {
                  // Save the point
                  setShowSaveModal(true);
                }
              }}
              className={`save-point-button ${currentPointSavedInfo ? 'saved' : ''}`}
              disabled={isLocked || isAtBasePoint}
              title={
                isAtBasePoint
                  ? 'Cannot save at start or goal'
                  : currentPointSavedInfo
                    ? `Unsave point "${currentPointSavedInfo.label}"`
                    : 'Save current point'
              }
            >
              {currentPointSavedInfo ? '★' : '☆'}
            </button>
          </div>
        </div>
        <div className="point-display-content">
          <>
            <div className="point-coordinates-compact desktop-only">
              {currentPoint.isInfinity ? (
                <div className="coordinate-value">Point at Infinity</div>
              ) : (
                <>
                  <div className="coordinate-row">
                    <span>x:</span>
                    <span className="coordinate-value">{bigintToHex(currentPoint.x)}</span>
                  </div>
                  <div className="coordinate-row">
                    <span>y:</span>
                    <span className="coordinate-value">{bigintToHex(currentPoint.y)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="point-compressed-key desktop-only">
              <span>
                Compressed:{' '}
                {currentPoint.isInfinity
                  ? 'N/A (Point at Infinity)'
                  : pointToPublicKey(currentPoint)}
              </span>
            </div>
            {/* Private Key Display - always show to keep UI steady */}
            <div className="point-private-key">
              <div className="private-key-row">
                <span>Private Key: </span>
                {(() => {
                  if (currentPoint.isInfinity) {
                    return <span className="private-key-value">N/A (Point at Infinity)</span>;
                  }

                  if (currentPrivateKey === null || currentPrivateKey === undefined) {
                    return <span className="private-key-value">Unknown</span>;
                  }

                  return (
                    <span
                      className="private-key-value clickable"
                      onClick={() => dispatch(togglePrivateKeyDisplayMode())}
                      title={
                        privateKeyHexMode ? 'Click to switch to decimal' : 'Click to switch to hex'
                      }
                    >
                      {privateKeyHexMode
                        ? '0x' + currentPrivateKey.toString(16)
                        : currentPrivateKey.toString()}
                    </span>
                  );
                })()}
              </div>
            </div>
          </>
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
          <button
            onClick={goHere}
            className={`calc-button gohere-display ${!calculatorDisplay ? 'disabled' : ''}`}
            disabled={!calculatorDisplay}
            title="Jump to G × scalar"
            data-testid="gohere-button"
          >
            →
          </button>
        </div>
        <div className="calculator-buttons">
          <div className="calculator-main-grid">
            {/* Row 1: Quick operations */}
            <button onClick={quickAddG} className="calc-button quick-op add">
              +1
            </button>
            <button onClick={quickSubtractG} className="calc-button quick-op subtract">
              -1
            </button>
            <button onClick={quickDouble} className="calc-button quick-op multiply">
              ×2
            </button>
            <button onClick={quickHalve} className="calc-button quick-op divide">
              ÷2
            </button>
            <button onClick={quickNegate} className="calc-button quick-op negate">
              ±
            </button>
            <button
              onClick={clearCalculator}
              className="calc-button clear"
              data-testid="clear-button"
            >
              C
            </button>
            <button onClick={backspaceCalculator} className="calc-button backspace">
              ⌫
            </button>

            {/* Row 2: 789AB + operators */}
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
            <button
              onClick={() => setCalculatorOperation(OperationType.DIVIDE)}
              className={`calc-button operator ${pendingOperation === OperationType.DIVIDE ? 'highlighted' : ''}`}
            >
              ÷
            </button>
            <button
              onClick={() => setCalculatorOperation(OperationType.MULTIPLY)}
              className={`calc-button operator ${pendingOperation === OperationType.MULTIPLY ? 'highlighted' : ''}`}
            >
              ×
            </button>

            {/* Row 3: 456CD + operators */}
            <button onClick={() => addToCalculator('4')} className="calc-button number">
              4
            </button>
            <button onClick={() => addToCalculator('5')} className="calc-button number">
              5
            </button>
            <button onClick={() => addToCalculator('6')} className="calc-button number">
              6
            </button>
            <button
              onClick={() => addToCalculator('C')}
              className="calc-button hex"
              data-testid="hex-c-button"
            >
              C
            </button>
            <button onClick={() => addToCalculator('D')} className="calc-button hex">
              D
            </button>
            <button
              onClick={() => setCalculatorOperation(OperationType.SUBTRACT)}
              className={`calc-button operator ${pendingOperation === OperationType.SUBTRACT ? 'highlighted' : ''}`}
            >
              -
            </button>
            <button
              onClick={() => setCalculatorOperation(OperationType.ADD)}
              className={`calc-button operator ${pendingOperation === OperationType.ADD ? 'highlighted' : ''}`}
            >
              +
            </button>

            {/* Row 4: 123EF + equals */}
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
            <button
              onClick={() => {
                if (pendingOperation && calculatorDisplay.trim()) {
                  executeCalculatorOperationRef.current?.(
                    pendingOperation,
                    calculatorDisplay.trim()
                  );
                }
              }}
              className="calc-button equals equals-span"
            >
              =
            </button>

            {/* Row 5: 0, 0x, rand, spacers */}
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
            <button
              onClick={() => {
                // Generate a random number between 2 and CURVE_N
                // Use crypto.getRandomValues for better randomness
                const randomBytes = new Uint8Array(32);
                crypto.getRandomValues(randomBytes);

                // Convert to BigInt and ensure it's in the range [2, CURVE_N)
                let randomBigInt = BigInt(
                  '0x' +
                    Array.from(randomBytes)
                      .map(b => b.toString(16).padStart(2, '0'))
                      .join('')
                );

                // Ensure the number is within the valid range
                const range = CURVE_N - BigInt(2);
                randomBigInt = (randomBigInt % range) + BigInt(2);

                setHexMode(true);
                setCalculatorDisplay('0x' + randomBigInt.toString(16).toUpperCase());
              }}
              className="calc-button rand"
              title="Generate random number"
            >
              rand
            </button>
          </div>
        </div>
      </div>

      <SavePointModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={label => onSavePoint(label)}
        defaultLabel={`Point ${(savedPoints || []).length + 1}`}
      />
    </div>
  );
};

export default ECCCalculator;
