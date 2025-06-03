import React, { useCallback, useEffect, useState } from 'react';
import type { Challenge } from '../types/api';
import { useECCCalculatorRedux } from '../hooks/useECCCalculatorRedux';
import { getP2PKHAddress } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { calculatePrivateKey } from '../utils/privateKeyCalculation';
import ECCCalculator from './ECCCalculator';
import ECCGraph from './ECCGraph';
import './ECCPlayground.css';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
import type { ECPoint, KnownPoint, SavedPoint } from '../types/ecc';
import { calculateChallengePrivateKeyFromGraph } from '../utils/graphPrivateKeyCalculation';

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
    calculatorDisplay,
    pendingOperation,
    lastOperationValue,
    hasWon,
    showVictoryModal,
    savedPoints,
    startingPoint,
    graph,
    setCurrentPoint,
    setOperations,
    setError,
    setShowVictoryModal,
    clearCalculator,
    addToCalculator,
    backspaceCalculator,
    resetToChallenge,
    resetToGenerator,
    savePoint,
    loadSavedPoint,
    setCalculatorOperation,
    executeEquals,
  } = useECCCalculatorRedux(challenge.public_key, isPracticeMode);

  const [challengeAddress, setChallengeAddress] = useState<string>('');
  const [showPointModal, setShowPointModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<KnownPoint | null>(null);

  const generatorPoint = getGeneratorPoint();

  const victoryPrivateKey = calculateChallengePrivateKeyFromGraph(challenge, graph);

  // Calculate the actual private key for a given point using shared utility
  const calculatePrivateKeyForPointWrapper = useCallback(
    (pointId: string): string | undefined => {
      // Check if this is a saved point
      const savedPoint = savedPoints.find(sp => sp.id === pointId);
      if (savedPoint) {
        // For saved points, use the full operation chain from the saved point
        const result = calculatePrivateKey(savedPoint);
        return result ? bigintToHex(result) : undefined;
      }

      // If we know the point, we can populate
      let privateKey = undefined;
      if (pointId === 'generator') {
        privateKey = 1n;
      } else if (pointId === 'original') {
        // TODO Should I calculate this somehow? What if we have already won, then we should know this
        privateKey = practicePrivateKey != null ? BigInt('0x' + practicePrivateKey) : undefined;
      } else if (pointId === 'current') {
        // if we are looking for the current point, try to calculate it
        // TODO Can we optimize how often we call this? Or cache the privateKey for the current point?
        // TODO Make the current point a KnownPoint object
        privateKey = calculatePrivateKey({
          id: pointId,
          point: currentPoint,
          startingPoint: startingPoint,
          operations: operations,
          label: pointId,
        });
      }
      return privateKey ? bigintToHex(privateKey) : undefined;
    },
    [operations, currentPoint, startingPoint, practicePrivateKey, savedPoints]
  );

  // Reset current point when challenge changes
  useEffect(() => {
    resetToChallenge(challenge.public_key);
  }, [challenge.public_key, resetToChallenge]);

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
  // TODO deduplicate, but I need to handle taps while the graph is in focus or whatever
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
          executeEquals();
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
      if (savedPoint) {
        setSelectedPoint(savedPoint);
      } else {
        // Read ID to figure out which known point to use to populate the modal
        if (pointId === 'generator') {
          // TODO Don't create the generator KnownPoint over and over, read it
          setSelectedPoint({
            id: pointId,
            point,
            label,
            privateKey: 1n,
            operations: [],
          });
        } else if (pointId === 'original') {
          // TODO Don't create the challenge KnownPoint over and over, read it
          setSelectedPoint({
            id: pointId,
            point,
            label,
            operations: [],
          });
        } else if (pointId === 'current') {
          setSelectedPoint({
            id: pointId,
            point: currentPoint,
            startingPoint: startingPoint,
            operations: operations,
            label: pointId,
          });
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
            startingPoint={startingPoint}
            challengePublicKey={challenge.public_key}
            onPointChange={(point, operation) => {
              setCurrentPoint(point);
              setOperations([...operations, operation]);
            }}
            onError={setError}
            onSavePoint={saveCurrentPoint}
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
        savedPoint={selectedPoint?.startingPoint}
        onLoadPoint={loadPoint}
        onRenamePoint={renameSavedPoint}
        pointData={
          selectedPoint
            ? {
                address: pointToPublicKey(selectedPoint.point),
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
        savedPoints={savedPoints}
        operationCount={operations.length}
        challengeAddress={challengeAddress}
        victoryPrivateKey={victoryPrivateKey ? '0x' + victoryPrivateKey.toString(16) : ''}
        isPracticeMode={isPracticeMode}
      />
    </div>
  );
};

export default ECCPlayground;
