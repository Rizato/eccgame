import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Challenge } from '../types/api';
import { useECCCalculatorRedux } from '../hooks/useECCCalculatorRedux';
import { calculatePrivateKeyByPointId } from '../utils/calculatePrivateKeyByPointId';
import { getP2PKHAddress } from '../utils/crypto';
import {
  bigintToHex,
  estimatePrivateKeyFromOperations,
  getGeneratorPoint,
  getPrivateKeyDistance,
  pointToPublicKey,
  publicKeyToPoint,
} from '../utils/ecc';
import { calculatePrivateKeyFromSavedPoint, type SavedPoint } from '../utils/privateKeyCalculation';
import ECCCalculator from './ECCCalculator';
import './ECCPlayground.css';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
import type { ECPoint } from '../utils/ecc';

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
  const {
    currentPoint,
    operations,
    error,
    currentAddress,
    calculatorDisplay,
    pendingOperation,
    lastOperationValue,
    hexMode,
    startingMode,
    hasWon,
    showVictoryModal,
    savedPoints,
    currentSavedPoint,
    setCurrentPoint,
    setOperations,
    setError,
    setStartingMode,
    setHasWon,
    setShowVictoryModal,
    clearCalculator,
    addToCalculator,
    backspaceCalculator,
    resetToChallenge,
    resetToGenerator,
    savePoint,
    loadSavedPoint,
  } = useECCCalculatorRedux(challenge.public_key, isPracticeMode);

  const [challengeAddress, setChallengeAddress] = useState<string>('');
  const [showPointModal, setShowPointModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    point: ECPoint;
    id: string;
    label: string;
  } | null>(null);
  const [selectedPointAddress, setSelectedPointAddress] = useState<string>('');

  const generatorPoint = getGeneratorPoint();
  const targetPoint = isPracticeMode ? generatorPoint : generatorPoint;

  // Calculate the actual private key for a given point using shared utility
  const calculatePrivateKeyForPointWrapper = useCallback(
    (pointId: string): string | undefined => {
      // Check if this is a saved point
      const savedPoint = savedPoints.find(sp => sp.id === pointId);

      if (savedPoint) {
        // For saved points, use the full operation chain from the saved point
        const result = calculatePrivateKeyFromSavedPoint(
          savedPoint,
          [], // No additional operations since we want the saved point's exact private key
          isPracticeMode,
          practicePrivateKey
        );
        return result ? bigintToHex(result) : undefined;
      }

      // Determine the starting private key based on current context
      let startingPrivateKey: bigint | undefined = undefined;

      if (currentSavedPoint) {
        // We're building from a saved point - use its private key if known
        startingPrivateKey = currentSavedPoint.privateKey;
      } else {
        // We're starting from a base point
        if (startingMode === 'generator') {
          // Started from generator point - we know private key is 1
          startingPrivateKey = 1n;
        } else if (startingMode === 'challenge' && isPracticeMode && practicePrivateKey) {
          // Started from challenge point in practice mode - we know the private key
          startingPrivateKey = BigInt('0x' + practicePrivateKey);
        }
        // If starting from challenge in daily mode, startingPrivateKey remains undefined
      }

      // For other points, use the existing logic
      const result = calculatePrivateKeyByPointId(
        pointId,
        operations,
        currentPoint,
        startingPrivateKey,
        isPracticeMode,
        practicePrivateKey
      );
      return result ? bigintToHex(result) : undefined;
    },
    [
      operations,
      currentPoint,
      startingMode,
      currentSavedPoint,
      isPracticeMode,
      practicePrivateKey,
      savedPoints,
    ]
  );

  // Reset current point when challenge changes
  useEffect(() => {
    resetToChallenge(challenge.public_key);
  }, [challenge.public_key, resetToChallenge]);

  // Directional win detection
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

  // Save current point (wrapper around Redux action)
  const saveCurrentPoint = useCallback(
    (label?: string) => {
      savePoint(label);
    },
    [savePoint]
  );

  // Load any point (for modal actions)
  const loadPoint = useCallback(
    (point: ECPoint, savedPoint?: SavedPoint) => {
      if (savedPoint) {
        loadSavedPoint(savedPoint);
      } else {
        // Loading a base point (generator or challenge)
        const isGenerator = point.x === generatorPoint.x && point.y === generatorPoint.y;
        if (isGenerator) {
          resetToGenerator();
        } else {
          resetToChallenge(challenge.public_key);
        }
      }
    },
    [loadSavedPoint, generatorPoint, resetToGenerator, resetToChallenge, challenge.public_key]
  );

  // Rename saved point (TODO: Add to Redux)
  const renameSavedPoint = useCallback((savedPoint: SavedPoint, newLabel: string) => {
    // TODO: Implement this in Redux
    console.warn('Rename saved point not yet implemented in Redux');
  }, []);

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

  const handlePointClick = useCallback(
    async (pointId: string, point: ECPoint, label: string, savedPoint?: SavedPoint) => {
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
    },
    []
  );

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
    const allPoints = [];

    // Always add generator point G
    const generatorEntry = {
      id: 'generator',
      x: generatorX,
      y: generatorY,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
      point: generatorPoint,
      type: 'generator' as const,
    };
    allPoints.push(generatorEntry);

    // Always add original challenge point
    const originalPoint = publicKeyToPoint(challenge.public_key);
    const originalX = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.x);
    const originalY = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.y, true);

    const originalEntry = {
      id: 'original',
      x: originalX,
      y: originalY,
      label: 'Wallet',
      color: '#f59e0b', // amber
      description: 'Original challenge point',
      point: originalPoint,
      type: 'challenge' as const,
    };
    allPoints.push(originalEntry);

    // Add saved points
    savedPoints.forEach(savedPoint => {
      if (!savedPoint.point.isInfinity) {
        const savedX = mapToScreenCoordinate(savedPoint.point.x);
        const savedY = mapToScreenCoordinate(savedPoint.point.y, true);

        allPoints.push({
          id: savedPoint.id,
          x: savedX,
          y: savedY,
          label: savedPoint.label, // Use full label name
          color: '#8b5cf6', // purple for saved points
          description: `Saved point: ${savedPoint.label}`,
          point: savedPoint.point,
          savedPoint,
          type: 'saved' as const,
        });
      }
    });

    // Add current point if it's unique
    if (!currentPoint.isInfinity) {
      const currentX = mapToScreenCoordinate(currentPoint.x);
      const currentY = mapToScreenCoordinate(currentPoint.y, true);

      allPoints.push({
        id: 'current',
        x: currentX,
        y: currentY,
        label: 'Current',
        color: '#ef4444', // red
        description: 'Current point',
        point: currentPoint,
        type: 'current' as const,
      });
    }

    // Group points by their coordinates to detect overlaps
    const groupedPoints = new Map<string, typeof allPoints>();

    allPoints.forEach(point => {
      const key = `${point.point.x}_${point.point.y}_${point.point.isInfinity}`;
      if (!groupedPoints.has(key)) {
        groupedPoints.set(key, []);
      }
      groupedPoints.get(key)!.push(point);
    });

    // Convert groups back to visible points, combining overlapping ones
    const visiblePoints = [];

    for (const [key, group] of groupedPoints) {
      if (group.length === 1) {
        // Single point - show as normal
        visiblePoints.push(group[0]);
      } else {
        // Multiple overlapping points - combine them
        const combinedLabels = group.map(p => p.label).join('/');
        const combinedDescriptions = group.map(p => p.description).join(' + ');

        // Create gradient color for overlapping points
        const colors = group.map(p => p.color);
        const gradientColor = `linear-gradient(45deg, ${colors.join(', ')})`;

        // Use the first point's position
        const basePoint = group[0];

        visiblePoints.push({
          ...basePoint,
          label: combinedLabels,
          color: gradientColor,
          description: combinedDescriptions,
          isOverlapping: true,
          overlappingPoints: group,
        });
      }
    }

    return visiblePoints;
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
                  className={`ecc-point ${point.id}${point.isOverlapping ? ' overlapping' : ''}`}
                  style={
                    {
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      '--point-color': point.isOverlapping ? 'transparent' : point.color,
                    } as React.CSSProperties
                  }
                  title={point.description}
                  onClick={() =>
                    handlePointClick(point.id, point.point, point.label, point.savedPoint)
                  }
                >
                  <div
                    className="point-dot"
                    style={
                      point.isOverlapping
                        ? {
                            background: point.color,
                            border: '2px solid var(--card-background)',
                          }
                        : {}
                    }
                  ></div>
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
              {savedPoints.length > 0 && (
                <div className="legend-item">
                  <div className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span>Saved</span>
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
            savedPoints={savedPoints}
            currentSavedPoint={currentSavedPoint}
            challengePublicKey={challenge.public_key}
            startingPrivateKey={(() => {
              // Determine starting private key
              if (currentSavedPoint) {
                return currentSavedPoint.privateKey;
              } else if (startingMode === 'generator') {
                return 1n;
              } else if (startingMode === 'challenge' && isPracticeMode && practicePrivateKey) {
                return BigInt('0x' + practicePrivateKey);
              }
              return undefined;
            })()}
            onPointChange={(point, operation) => {
              setCurrentPoint(point);
              setOperations(prev => [...prev, operation]);
            }}
            onError={setError}
            onSavePoint={saveCurrentPoint}
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
        point={selectedPoint?.point}
        savedPoint={graphPoints.find(p => p.id === selectedPoint?.id)?.savedPoint}
        onLoadPoint={loadPoint}
        onRenamePoint={renameSavedPoint}
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
                privateKey: calculatePrivateKeyForPointWrapper(selectedPoint.id),
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
        currentSavedPoint={currentSavedPoint}
        isPracticeMode={isPracticeMode}
        practicePrivateKey={practicePrivateKey}
      />
    </div>
  );
};

export default ECCPlayground;
