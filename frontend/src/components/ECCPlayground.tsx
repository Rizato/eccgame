import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Challenge } from '../types/api';
import type { ECPoint } from '../utils/ecc';
import ECCCalculator, { type Operation } from './ECCCalculator';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
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
  bigintToHex,
} from '../utils/ecc';
import { calculatePrivateKeyByPointId } from '../utils/calculatePrivateKeyByPointId';
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
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [challengeAddress, setChallengeAddress] = useState<string>('');
  const [calculatorDisplay, setCalculatorDisplay] = useState('');
  const [pendingOperation, setPendingOperation] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [lastOperationValue, setLastOperationValue] = useState<string | null>(null);
  const [hexMode, setHexMode] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    point: ECPoint;
    id: string;
    label: string;
  } | null>(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState<string>('');
  const [startingMode, setStartingMode] = useState<'challenge' | 'generator'>('challenge');

  const generatorPoint = getGeneratorPoint();
  const targetPoint = isPracticeMode ? generatorPoint : generatorPoint;

  // Calculate the actual private key for a given point using shared utility
  const calculatePrivateKeyForPointWrapper = useCallback(
    (pointId: string): string | undefined => {
      const result = calculatePrivateKeyByPointId(
        pointId,
        operations,
        startingMode,
        isPracticeMode,
        practicePrivateKey
      );
      return result ? bigintToHex(result) : undefined;
    },
    [operations, startingMode, isPracticeMode, practicePrivateKey]
  );

  // Calculator functions
  const clearCalculator = useCallback(() => {
    setCalculatorDisplay('');
    setPendingOperation(null);
    setHexMode(false);
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
    if (startingMode === 'challenge') {
      setCurrentPoint(publicKeyToPoint(challenge.public_key));
    } else {
      setCurrentPoint(generatorPoint);
    }
    setOperations([]);
    setError(null);
    clearCalculator();
    setLastOperationValue(null);
    setHasWon(false);
    setShowVictoryModal(false);
  }, [challenge.public_key, clearCalculator]);

  // Directional win detection (must come before useEffect that uses hasWonRound)
  const challengePoint = publicKeyToPoint(challenge.public_key);

  const isAtGenerator =
    currentPoint.x === generatorPoint.x &&
    currentPoint.y === generatorPoint.y &&
    !currentPoint.isInfinity;

  const isAtChallengePoint =
    currentPoint.x === challengePoint.x &&
    currentPoint.y === challengePoint.y &&
    !currentPoint.isInfinity;

  const isAtInfinity = currentPoint.isInfinity;

  // Check for win condition based on direction
  const hasWonRound = (() => {
    if (startingMode === 'challenge') {
      // Challenge -> G: win on generator point or infinity
      return isAtGenerator || isAtInfinity;
    } else {
      // G -> Challenge: win on challenge point or infinity
      return isAtChallengePoint || isAtInfinity;
    }
  })();

  // Check for win condition
  useEffect(() => {
    if (hasWonRound && !hasWon) {
      setHasWon(true);
      setShowVictoryModal(true);
      // For practice mode, allow continued play. For daily challenges, lock calculator
      if (!isPracticeMode) {
        // Calculator will be locked via hasWon state
      }
    }
  }, [hasWonRound, hasWon, isPracticeMode]);

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

  // Calculate challenge address (this doesn't change during the session)
  useEffect(() => {
    const calculateChallengeAddress = async () => {
      try {
        const challengePoint = publicKeyToPoint(challenge.public_key);
        const pubKey = pointToPublicKey(challengePoint);
        const address = await getP2PKHAddress(pubKey);
        setChallengeAddress(address);
      } catch {
        setChallengeAddress('Invalid');
      }
    };

    calculateChallengeAddress();
  }, [challenge.public_key]);

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
              direction: op.direction,
            }));

            // Estimate current private key from operations
            const estimatedPrivateKey = estimatePrivateKeyFromOperations(
              convertedOperations,
              startingPoint,
              generatorPoint
            );

            // Calculate progress based on private key distance
            return getPrivateKeyDistance(estimatedPrivateKey, targetPrivateKey);
          } catch {
            // Fallback: basic progress based on whether we've won
            return hasWonRound ? 100 : 0;
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
      } else if (calculatorDisplay.trim() && pendingOperation) {
        // If there's already a pending operation, execute it with current display value
        executeCalculatorOperationRef.current?.(pendingOperation, calculatorDisplay.trim());
        // Then set the new operation as pending
        setPendingOperation(operation);
      } else if (lastOperationValue) {
        // If no value but we have a last operation value, reuse it
        executeCalculatorOperationRef.current?.(operation, lastOperationValue);
      } else {
        // Just set the pending operation and highlight
        setPendingOperation(operation);
      }
    },
    [calculatorDisplay, pendingOperation, lastOperationValue]
  );

  // Reset to specified starting point
  const resetToStartingPoint = useCallback(
    (mode: 'challenge' | 'generator') => {
      // Force immediate state clearing to avoid stale state issues
      setOperations([]);
      setStartingMode(mode);
      setError(null);
      clearCalculator();
      setLastOperationValue(null);
      setHasWon(false);
      setShowVictoryModal(false);

      // Set the starting point after clearing state
      if (mode === 'challenge') {
        setCurrentPoint(publicKeyToPoint(challenge.public_key));
      } else {
        setCurrentPoint(generatorPoint);
      }
    },
    [challenge.public_key, generatorPoint, clearCalculator]
  );

  // Submit solution attempt (keeping for backward compatibility, but victory modal is primary)
  const submitSolution = useCallback(async () => {
    if (!hasWonRound) {
      const targetName =
        startingMode === 'challenge'
          ? 'generator point (G) or point at infinity'
          : 'challenge point or point at infinity';
      setError(`You must reach the ${targetName} to submit a solution`);
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
  }, [hasWonRound, onSolve, startingMode]);

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

  // Calculate generator point screen coordinates
  const generatorX = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.x);
  const generatorY = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.y, true);

  const getVisiblePoints = () => {
    const points = [];

    // Always show generator point G (using actual coordinates)
    points.push({
      id: 'generator',
      x: generatorX,
      y: generatorY,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
      point: generatorPoint,
    });

    // Always show original challenge point
    const originalPoint = publicKeyToPoint(challenge.public_key);
    const originalX = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.x);
    const originalY = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.y, true);

    points.push({
      id: 'original',
      x: originalX,
      y: originalY,
      label: 'Wallet',
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
              <div className="generator-line" style={{ left: `${generatorX}%` }}></div>

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
                <span>Wallet</span>
              </div>
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
            operations={operations}
            onPointChange={(point, operation) => {
              setCurrentPoint(point);
              setOperations(prev => [...prev, operation]);
            }}
            onError={setError}
            onResetPoint={resetToStartingPoint}
            startingMode={startingMode}
            isPracticeMode={isPracticeMode}
            practicePrivateKey={practicePrivateKey}
            isLocked={hasWon && !isPracticeMode}
          />
        </div>
      </div>

      <Modal
        isOpen={showPointModal && !!selectedPoint}
        onClose={() => setShowPointModal(false)}
        title={selectedPoint ? `${selectedPoint.label} Point Information` : ''}
        isPracticeMode={isPracticeMode}
        practicePrivateKey={practicePrivateKey}
        pointData={
          selectedPoint
            ? {
                address: selectedPointAddress,
                compressedKey: selectedPoint.point.isInfinity
                  ? '020000000000000000000000000000000000000000000000000000000000000000'
                  : (() => {
                      try {
                        return pointToPublicKey(selectedPoint.point);
                      } catch {
                        return 'Invalid point';
                      }
                    })(),
                xCoordinate: selectedPoint.point.isInfinity
                  ? '0000000000000000000000000000000000000000000000000000000000000000'
                  : bigintToHex(selectedPoint.point.x),
                yCoordinate: selectedPoint.point.isInfinity
                  ? '0000000000000000000000000000000000000000000000000000000000000000'
                  : bigintToHex(selectedPoint.point.y),
                privateKey: bigintToHex(calculatePrivateKeyForPointWrapper(selectedPoint.id)),
                distanceToTarget:
                  selectedPoint.id === 'current' && isPracticeMode && practicePrivateKey
                    ? (() => {
                        try {
                          const targetPrivateKey = BigInt('0x' + practicePrivateKey);
                          const startingPoint = publicKeyToPoint(challenge.public_key);
                          const convertedOperations = operations.map(op => ({
                            type: op.type,
                            value: op.value
                              ? BigInt(op.value)
                              : op.point || { x: 0n, y: 0n, isInfinity: true },
                            direction: op.direction,
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
                      })()
                    : undefined,
              }
            : undefined
        }
      />

      <VictoryModal
        isOpen={showVictoryModal}
        onClose={() => {
          setShowVictoryModal(false);
          if (isPracticeMode) {
            // Allow continuing in practice mode
          }
        }}
        operationCount={operations.length}
        challengeAddress={challengeAddress}
        startingMode={startingMode}
        targetPoint={currentPoint}
        operations={operations}
        isPracticeMode={isPracticeMode}
      />
    </div>
  );
};

export default ECCPlayground;
