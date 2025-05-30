import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Challenge } from '../types/api';
import type { ECPoint } from '../utils/ecc';
import ECCCalculator, { type Operation } from './ECCCalculator';
import {
  getGeneratorPoint,
  publicKeyToPoint,
  pointAdd,
  pointSubtract,
  pointMultiply,
  pointDivide,
  getPrivateKeyDistance,
  estimatePrivateKeyFromOperations,
  pointToPublicKey,
  CURVE_N,
  bigintToHex,
  hexToBigint,
  isPointOnCurve,
} from '../utils/ecc';
import { getP2PKHAddress } from '../utils/crypto';
import './ECCPlayground.css';

interface ECCPlaygroundProps {
  challenge: Challenge;
  onSolve: (privateKey: string) => void;
  isPracticeMode?: boolean;
  practicePrivateKey?: string;
}

const ECCPlayground: React.FC<ECCPlaygroundProps> = ({
  challenge,
  onSolve,
  isPracticeMode = false,
  practicePrivateKey,
}) => {
  const [currentPoint, setCurrentPoint] = useState<ECPoint>(() =>
    publicKeyToPoint(challenge.public_key)
  );
  const [operations, setOperations] = useState<Operation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [calculatorDisplay, setCalculatorDisplay] = useState('');
  const [pendingOperation, setPendingOperation] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [lastOperationValue, setLastOperationValue] = useState<string | null>(null);
  const [operatorHighlighted, setOperatorHighlighted] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [hexMode, setHexMode] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    point: ECPoint;
    id: string;
    label: string;
  } | null>(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState<string>('');

  const generatorPoint = getGeneratorPoint();
  const targetPoint = isPracticeMode ? generatorPoint : generatorPoint;

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

  // Reset current point when challenge changes
  useEffect(() => {
    setCurrentPoint(publicKeyToPoint(challenge.public_key));
    setOperations([]);
    setError(null);
    clearCalculator();
    setLastOperationValue(null);
  }, [challenge.public_key, clearCalculator]);

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

  // Check if we've reached the generator (solution)
  const isAtGenerator =
    currentPoint.x === generatorPoint.x &&
    currentPoint.y === generatorPoint.y &&
    !currentPoint.isInfinity;

  // Calculate progress based on private key distance in practice mode
  const progress =
    isPracticeMode && practicePrivateKey
      ? (() => {
          try {
            const targetPrivateKey = BigInt('0x' + practicePrivateKey);
            const startingPoint = publicKeyToPoint(challenge.public_key);

            // Convert operations to expected format for estimation
            const convertedOperations = operations.map(op => ({
              type: op.type,
              value: op.value ? BigInt(op.value) : op.point || { x: 0n, y: 0n, isInfinity: true },
            }));

            // Estimate current private key from operations
            const estimatedPrivateKey = estimatePrivateKeyFromOperations(
              convertedOperations,
              startingPoint,
              targetPoint
            );

            // Calculate progress based on private key distance
            return getPrivateKeyDistance(estimatedPrivateKey, targetPrivateKey);
          } catch {
            // Fallback: basic progress based on whether we're at the generator
            return isAtGenerator ? 100 : 0;
          }
        })()
      : null;

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
      setError(null);
      const newPoint = pointAdd(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        setError('Result is not on the curve');
        return;
      }
      setCurrentPoint(newPoint);
      setOperations(prev => [
        ...prev,
        {
          id: `op_${Date.now()}`,
          type: 'add',
          description: '+G',
          point: generatorPoint,
        },
      ]);
    } catch (error) {
      setError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint]);

  const quickSubtractG = useCallback(() => {
    try {
      setError(null);
      const newPoint = pointSubtract(currentPoint, generatorPoint);
      if (!isPointOnCurve(newPoint)) {
        setError('Result is not on the curve');
        return;
      }
      setCurrentPoint(newPoint);
      setOperations(prev => [
        ...prev,
        {
          id: `op_${Date.now()}`,
          type: 'subtract',
          description: '-G',
          point: generatorPoint,
        },
      ]);
    } catch (error) {
      setError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint, generatorPoint]);

  const quickDouble = useCallback(() => {
    try {
      setError(null);
      const newPoint = pointMultiply(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        setError('Result is not on the curve');
        return;
      }
      setCurrentPoint(newPoint);
      setOperations(prev => [
        ...prev,
        {
          id: `op_${Date.now()}`,
          type: 'multiply',
          description: '×2',
          value: '2',
        },
      ]);
    } catch (error) {
      setError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint]);

  const quickHalve = useCallback(() => {
    try {
      setError(null);
      const newPoint = pointDivide(2n, currentPoint);
      if (!isPointOnCurve(newPoint)) {
        setError('Result is not on the curve');
        return;
      }
      setCurrentPoint(newPoint);
      setOperations(prev => [
        ...prev,
        {
          id: `op_${Date.now()}`,
          type: 'divide',
          description: '÷2',
          value: '2',
        },
      ]);
    } catch (error) {
      setError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentPoint]);

  const executeCalculatorOperation = useCallback(
    (operation: 'multiply' | 'divide' | 'add' | 'subtract', value: string) => {
      try {
        setError(null);

        if (operation === 'multiply' || operation === 'divide') {
          // For scalar operations
          if (!value.trim()) {
            setError('Please enter a scalar value');
            return;
          }

          let scalar: bigint;
          try {
            if (value.startsWith('0x')) {
              scalar = hexToBigint(value);
            } else if (value.includes('.')) {
              setError('Decimal numbers not supported. Use integers or hex values.');
              return;
            } else {
              scalar = BigInt(value);
            }
          } catch {
            setError('Invalid scalar value');
            return;
          }

          if (scalar <= 0n) {
            setError('Scalar must be positive');
            return;
          }

          if (scalar >= CURVE_N) {
            setError('Scalar too large for secp256k1 curve');
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
            setError('Result is not on the curve');
            return;
          }

          setCurrentPoint(newPoint);
          setOperations(prev => [
            ...prev,
            {
              id: `op_${Date.now()}`,
              type: operation,
              description,
              value,
            },
          ]);

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
        setError(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [currentPoint, clearCalculator, quickAddG, quickSubtractG]
  );

  // Assign the function to the ref so it can be called from setCalculatorOperation
  executeCalculatorOperationRef.current = executeCalculatorOperation;

  // Reset to challenge point
  const resetToChallenge = useCallback(() => {
    setCurrentPoint(publicKeyToPoint(challenge.public_key));
    setOperations([]);
    setError(null);
    clearCalculator();
    setLastOperationValue(null);
  }, [challenge.public_key, clearCalculator]);

  // Submit solution attempt
  const submitSolution = useCallback(async () => {
    if (!isAtGenerator) {
      setError('You must reach the generator point G to submit a solution');
      return;
    }

    try {
      // For now, we'll use a placeholder private key
      // In a full implementation, we'd reconstruct it from operations
      const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
      await onSolve(privateKey);
    } catch (error) {
      setError(
        `Solution submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [isAtGenerator, onSolve]);

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

  const handlePointChange = useCallback((newPoint: ECPoint) => {
    setCurrentPoint(newPoint);
  }, []);

  const handlePointClick = useCallback(async (pointId: string, point: ECPoint, label: string) => {
    setSelectedPoint({ point, id: pointId, label });

    // Calculate address for the selected point
    if (point.isInfinity) {
      setSelectedPointAddress('Point at Infinity');
    } else {
      try {
        const pubKey = pointToPublicKey(point);
        const address = await getP2PKHAddress(pubKey);
        setSelectedPointAddress(address);
      } catch {
        setSelectedPointAddress('Invalid');
      }
    }

    setShowPointModal(true);
  }, []);

  // Map large coordinate values to screen percentage (0-100)
  const mapToScreenCoordinate = (coord: bigint, isY: boolean = false) => {
    // Use the last 32 bits for better distribution
    const lastBits = Number(coord & 0xffffffffn);
    const percentage = (lastBits % 80) + 10; // Keep between 10-90% to avoid edges
    return isY ? percentage : percentage;
  };

  const getVisiblePoints = () => {
    const points = [];

    // Always show generator point G (fixed position)
    points.push({
      id: 'generator',
      x: 30,
      y: 40,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
      point: generatorPoint,
    });

    // Show target point in practice mode
    if (isPracticeMode && practicePrivateKey) {
      try {
        const targetPrivateKey = BigInt('0x' + practicePrivateKey);
        const calculatedTargetPoint = pointMultiply(targetPrivateKey, generatorPoint);

        if (!calculatedTargetPoint.isInfinity) {
          const targetX = mapToScreenCoordinate(calculatedTargetPoint.x);
          const targetY = mapToScreenCoordinate(calculatedTargetPoint.y, true);

          points.push({
            id: 'target',
            x: targetX,
            y: targetY,
            label: 'Target',
            color: '#8b5cf6', // purple
            description: 'Target point (practice mode)',
            point: calculatedTargetPoint,
          });
        }
      } catch {
        // If target calculation fails, don't show target point
      }
    }

    // Always show original challenge point
    const originalPoint = publicKeyToPoint(challenge.public_key);
    const originalX = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.x);
    const originalY = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.y, true);

    points.push({
      id: 'original',
      x: originalX,
      y: originalY,
      label: 'Start',
      color: '#f59e0b', // amber
      description: 'Original challenge point',
      point: originalPoint,
    });

    // Calculate and show previous point (before most recent operation)
    let previousPoint: ECPoint | null = null;
    if (operations.length > 0) {
      // Reconstruct the point before the last operation
      const lastOperation = operations[operations.length - 1];

      try {
        if (lastOperation.type === 'multiply' && lastOperation.value) {
          const scalar = BigInt(lastOperation.value);
          previousPoint = pointDivide(scalar, currentPoint);
        } else if (lastOperation.type === 'divide' && lastOperation.value) {
          const scalar = BigInt(lastOperation.value);
          previousPoint = pointMultiply(scalar, currentPoint);
        } else if (lastOperation.type === 'add' && lastOperation.point) {
          previousPoint = pointSubtract(currentPoint, lastOperation.point);
        } else if (lastOperation.type === 'subtract' && lastOperation.point) {
          previousPoint = pointAdd(currentPoint, lastOperation.point);
        }
      } catch {
        // If we can't calculate previous point, don't show it
        previousPoint = null;
      }
    }

    // Show previous point if it exists and is different from original and current
    if (
      previousPoint &&
      !previousPoint.isInfinity &&
      (previousPoint.x !== originalPoint.x || previousPoint.y !== originalPoint.y) &&
      (previousPoint.x !== currentPoint.x || previousPoint.y !== currentPoint.y)
    ) {
      const prevX = mapToScreenCoordinate(previousPoint.x);
      const prevY = mapToScreenCoordinate(previousPoint.y, true);

      points.push({
        id: 'previous',
        x: prevX,
        y: prevY,
        label: 'Prev',
        color: '#9ca3af', // gray
        description: 'Previous point (before last operation)',
        point: previousPoint,
      });
    }

    // Current point (only if different from original)
    if (
      !currentPoint.isInfinity &&
      (currentPoint.x !== originalPoint.x || currentPoint.y !== originalPoint.y)
    ) {
      const currentX = mapToScreenCoordinate(currentPoint.x);
      const currentY = mapToScreenCoordinate(currentPoint.y, true);

      points.push({
        id: 'current',
        x: currentX,
        y: currentY,
        label: 'Current',
        color: isAtGenerator ? '#22c55e' : '#ef4444', // green if at generator, red otherwise
        description: 'Current point',
        point: currentPoint,
      });
    }

    return points;
  };

  const graphPoints = getVisiblePoints();

  return (
    <div className="ecc-playground">
      {/* Practice/Target Info Section */}
      <div className="practice-target-info">
        {isPracticeMode && (
          <div className="practice-indicator">
            <span className="practice-badge">Practice Mode</span>
            {progress !== null && (
              <div className="progress-display">Progress: {progress.toFixed(1)}%</div>
            )}
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="playground-content">
        {/* Integrated Graph-Calculator Layout */}
        <div className="graph-calculator-integrated">
          {/* ECC Graph Visualization */}
          <div className="graph-section graph-display">
            <div className="graph-content">
              <div className="formula">y² = x³ + 7 (mod p)</div>
            </div>

            <div className="ecc-graph">
              {/* Graph border */}
              <div className="graph-border"></div>

              {/* Coordinate system */}
              <div className="graph-axes">
                <div className="axis-label x-label">x</div>
                <div className="axis-label y-label">y</div>
              </div>

              {/* Vertical dashed line at G */}
              <div className="generator-line"></div>

              {/* Curve visualization */}
              <div className="curve-line"></div>

              {/* Plot points */}
              {graphPoints.map(point => (
                <div
                  key={point.id}
                  className={`ecc-point ${point.id}`}
                  style={
                    {
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      '--point-color': point.color,
                    } as React.CSSProperties
                  }
                  title={point.description}
                  onClick={() => handlePointClick(point.id, point.point, point.label)}
                >
                  <div className="point-dot"></div>
                  <div className="point-label">{point.label}</div>
                </div>
              ))}

              {/* Graph range indicators */}
              <div className="range-indicator bottom-left">0</div>
              <div className="range-indicator bottom-right">p</div>
              <div className="range-indicator top-left">p</div>
            </div>

            {/* Legend at bottom */}
            <div className="legend-grid">
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></div>
                <span>G</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
                <span>Start</span>
              </div>
              {isPracticeMode && graphPoints.some(p => p.id === 'target') && (
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span>Target</span>
                </div>
              )}
              {graphPoints.some(p => p.id === 'previous') && (
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#9ca3af' }}></div>
                  <span>Prev</span>
                </div>
              )}
              <div className="legend-item">
                <div
                  className="legend-dot"
                  style={{ backgroundColor: isAtGenerator ? '#22c55e' : '#ef4444' }}
                ></div>
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Calculator Section */}
          <ECCCalculator
            currentPoint={currentPoint}
            onPointChange={handlePointChange}
            onError={setError}
            onShowPointModal={() => setShowPointModal(true)}
            onResetPoint={resetToChallenge}
            isPracticeMode={isPracticeMode}
            practicePrivateKey={practicePrivateKey}
            progress={progress}
          />
        </div>
      </div>

      {showPointModal && selectedPoint && (
        <div className="modal-overlay" onClick={() => setShowPointModal(false)}>
          <div className="point-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedPoint.label} Point Information</h3>
              <button onClick={() => setShowPointModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-content">
              {selectedPoint.point.isInfinity ? (
                <div className="modal-item">
                  <span className="modal-label">Status:</span>
                  <div className="modal-value-container">
                    <input className="modal-value-input" value="Point at Infinity (O)" readOnly />
                  </div>
                </div>
              ) : (
                <>
                  <div className="modal-item">
                    <span className="modal-label">Address:</span>
                    <div className="modal-value-container">
                      <input className="modal-value-input" value={selectedPointAddress} readOnly />
                      <button
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(selectedPointAddress)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="modal-item">
                    <span className="modal-label">Compressed Key:</span>
                    <div className="modal-value-container">
                      <input
                        className="modal-value-input"
                        value={(() => {
                          try {
                            return pointToPublicKey(selectedPoint.point);
                          } catch {
                            return 'Invalid point';
                          }
                        })()}
                        readOnly
                      />
                      <button
                        className="copy-button"
                        onClick={() => {
                          try {
                            const compressedKey = pointToPublicKey(selectedPoint.point);
                            navigator.clipboard.writeText(compressedKey);
                          } catch {}
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="modal-item">
                    <span className="modal-label">X Coordinate:</span>
                    <div className="modal-value-container">
                      <input
                        className="modal-value-input"
                        value={bigintToHex(selectedPoint.point.x)}
                        readOnly
                      />
                      <button
                        className="copy-button"
                        onClick={() =>
                          navigator.clipboard.writeText(bigintToHex(selectedPoint.point.x))
                        }
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="modal-item">
                    <span className="modal-label">Y Coordinate:</span>
                    <div className="modal-value-container">
                      <input
                        className="modal-value-input"
                        value={bigintToHex(selectedPoint.point.y)}
                        readOnly
                      />
                      <button
                        className="copy-button"
                        onClick={() =>
                          navigator.clipboard.writeText(bigintToHex(selectedPoint.point.y))
                        }
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {isPracticeMode && practicePrivateKey && (
                    <>
                      <div className="modal-item">
                        <span className="modal-label">Private Key:</span>
                        <div className="modal-value-container">
                          <input
                            className="modal-value-input"
                            value={practicePrivateKey}
                            readOnly
                          />
                          <button
                            className="copy-button"
                            onClick={() => navigator.clipboard.writeText(practicePrivateKey)}
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {selectedPoint.id === 'current' && (
                        <div className="modal-item">
                          <span className="modal-label">Distance to Target:</span>
                          <div className="modal-value-container">
                            <input
                              className="modal-value-input"
                              value={(() => {
                                try {
                                  const targetPrivateKey = BigInt('0x' + practicePrivateKey);
                                  const startingPoint = publicKeyToPoint(challenge.public_key);
                                  const convertedOperations = operations.map(op => ({
                                    type: op.type,
                                    value: op.value
                                      ? BigInt(op.value)
                                      : op.point || { x: 0n, y: 0n, isInfinity: true },
                                  }));
                                  const estimatedPrivateKey = estimatePrivateKeyFromOperations(
                                    convertedOperations,
                                    startingPoint,
                                    targetPoint
                                  );
                                  const distance = getPrivateKeyDistance(
                                    estimatedPrivateKey,
                                    targetPrivateKey
                                  );
                                  return `${distance.toFixed(3)}% similarity`;
                                } catch {
                                  return 'Unable to calculate';
                                }
                              })()}
                              readOnly
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isAtGenerator && (
        <div className="generator-reached">
          🎯 You've reached the generator point G!
          <button onClick={submitSolution} className="submit-solution">
            Submit Solution
          </button>
        </div>
      )}
    </div>
  );
};

export default ECCPlayground;
