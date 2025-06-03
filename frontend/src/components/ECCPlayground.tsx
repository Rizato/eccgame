import React, { useCallback, useEffect, useState, useMemo } from 'react';
import type { Challenge } from '../types/api';
import { useECCCalculatorRedux } from '../hooks/useECCCalculatorRedux';
import { getP2PKHAddress } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { calculatePrivateKeyFromGraph } from '../utils/pointPrivateKey';
import { findNodeByPoint, findPath } from '../utils/pointGraph';
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
    error,
    calculatorDisplay,
    pendingOperation,
    lastOperationValue,
    hasWon,
    showVictoryModal,
    savedPoints,
    graph,
    setCurrentPoint,
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

  // Calculate shortest path length from generator to challenge
  const shortestPathLength = useMemo(() => {
    const generatorNode = Array.from(graph.nodes.values()).find(node => node.isGenerator);
    const challengeNode = Array.from(graph.nodes.values()).find(node => node.isChallenge);

    if (!generatorNode || !challengeNode) {
      return 0;
    }

    const path = findPath(graph, generatorNode.id, challengeNode.id);
    return path ? path.length : 0;
  }, [graph]);

  // Calculate the actual private key for a given point using shared utility
  const calculatePrivateKeyForPointWrapper = useCallback(
    (pointId: string): string | undefined => {
      let point: ECPoint | undefined;

      // Check if this is a saved point
      const savedPoint = savedPoints.find(sp => sp.id === pointId);
      if (savedPoint) {
        point = savedPoint.point;
      } else if (pointId === 'generator') {
        point = generatorPoint;
      } else if (pointId === 'original') {
        point = publicKeyToPoint(challenge.public_key);
      } else if (pointId === 'current') {
        point = currentPoint;
      }

      if (!point) return undefined;

      // Calculate from graph
      const privateKey = calculatePrivateKeyFromGraph(point, graph);
      return privateKey ? bigintToHex(privateKey) : undefined;
    },
    [
      currentPoint,
      graph,
      generatorPoint,
      challenge.public_key,
      practicePrivateKey,
      isPracticeMode,
      savedPoints,
    ]
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
    async (point: ECPoint, savedPoint?: SavedPoint) => {
      if (savedPoint) {
        setSelectedPoint(savedPoint);
      } else {
        // Look up point information from the graph
        const node = findNodeByPoint(graph, point);
        const generatorPoint = getGeneratorPoint();
        const challengePoint = publicKeyToPoint(challenge.public_key);

        let label = 'Unknown Point';
        let id = 'unknown';

        if (node) {
          label = node.label;
          id = node.id;
        } else {
          // Fallback for points not in graph
          if (point.x === generatorPoint.x && point.y === generatorPoint.y) {
            label = 'Generator (G)';
            id = 'generator';
          } else if (point.x === challengePoint.x && point.y === challengePoint.y) {
            label = 'Challenge Point';
            id = 'challenge';
          } else if (point.x === currentPoint.x && point.y === currentPoint.y) {
            label = 'Current Point';
            id = 'current';
          }
        }

        setSelectedPoint({
          id,
          point,
          label,
        });
      }
      setShowPointModal(true);
    },
    [graph, challenge.public_key, currentPoint]
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
            savedPoints={savedPoints}
            challengePublicKey={challenge.public_key}
            onPointChange={(point, operation) => {
              setCurrentPoint(point);
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
        operationCount={shortestPathLength}
        challengeAddress={challengeAddress}
        victoryPrivateKey={victoryPrivateKey ? '0x' + victoryPrivateKey.toString(16) : ''}
        isPracticeMode={isPracticeMode}
      />
    </div>
  );
};

export default ECCPlayground;
