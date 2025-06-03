import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Challenge } from '../types/api';
import { useECCCalculatorRedux } from '../hooks/useECCCalculatorRedux';
import { calculatePrivateKeyByPointId } from '../utils/calculatePrivateKeyByPointId';
import { getP2PKHAddress } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { calculatePrivateKeyFromSavedPoint, type SavedPoint } from '../utils/privateKeyCalculation';
import ECCCalculator from './ECCCalculator';
import ECCGraph from './ECCGraph';
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
  onSolve: _onSolve,
  isPracticeMode = false,
  practicePrivateKey,
}) => {
  const {
    currentPoint,
    operations,
    error,
    currentAddress: _currentAddress,
    calculatorDisplay,
    pendingOperation,
    lastOperationValue,
    hexMode: _hexMode,
    startingMode,
    hasWon,
    showVictoryModal,
    savedPoints,
    currentSavedPoint,
    setCurrentPoint,
    setOperations,
    setError,
    setStartingMode: _setStartingMode,
    setHasWon: _setHasWon,
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
  const _hasWonRound = (() => {
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
  const renameSavedPoint = useCallback((_savedPoint: SavedPoint, _newLabel: string) => {
    // TODO: Implement this in Redux
    console.warn('Rename saved point not yet implemented in Redux');
  }, []);

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
    async (pointId: string, point: ECPoint, label: string, _savedPoint?: SavedPoint) => {
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

  return (
    <div className="ecc-playground">
      {error && <div className="error-message">{error}</div>}

      <div className="playground-content">
        {/* Integrated Graph-Calculator Layout */}
        <div className="graph-calculator-integrated">
          {/* ECC Graph Visualization */}
          <ECCGraph challengePublicKey={challenge.public_key} onPointClick={handlePointClick} />

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
