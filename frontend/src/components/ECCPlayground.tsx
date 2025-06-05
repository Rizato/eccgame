import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import type { Challenge } from '../types/api';
import { useDailyCalculatorRedux } from '../hooks/useDailyCalculatorRedux';
import { usePracticeCalculatorRedux } from '../hooks/usePracticeCalculatorRedux';
import { getP2PKHAddress } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { calculatePrivateKeyFromGraph } from '../utils/pointPrivateKey';
import { findNodeByPoint, findPath } from '../utils/pointGraph';
import ECCCalculator from './ECCCalculator';
import ECCGraph from './ECCGraph';
import './ECCPlayground.css';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
import type { ECPoint } from '../types/ecc';
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
  // Use the appropriate calculator hook based on mode
  const dailyCalculator = useDailyCalculatorRedux(challenge.public_key);
  const practiceCalculator = usePracticeCalculatorRedux(
    challenge.public_key,
    practicePrivateKey || ''
  );

  // Select the appropriate calculator based on mode
  const calculator = isPracticeMode ? practiceCalculator : dailyCalculator;

  const {
    currentPoint,
    error,
    hasWon,
    showVictoryModal,
    savedPoints,
    graph,
    setCurrentPoint,
    setError,
    setShowVictoryModal,
    resetToChallenge,
    resetToGenerator,
    savePoint,
    loadSavedPoint,
  } = calculator;

  const [challengeAddress, setChallengeAddress] = useState<string>('');
  const [showPointModal, setShowPointModal] = useState(false);
  const [modalPoint, setModalPoint] = useState<ECPoint | null>(null);
  const [modalPointAddress, setModalPointAddress] = useState<string>('');

  const calculatorDisplayRef = useRef<((value: string) => void) | null>(null);
  const generatorPoint = getGeneratorPoint();

  const victoryPrivateKey = useMemo(() => {
    return calculateChallengePrivateKeyFromGraph(challenge, graph);
  }, [challenge, graph]);

  // Calculate total number of operations from generator to challenge
  const totalOperationCount = useMemo(() => {
    const generatorNode = Object.values(graph.nodes).find(node => node.isGenerator);
    const challengeNode = Object.values(graph.nodes).find(node => node.isChallenge);

    if (!generatorNode || !challengeNode) {
      return 0;
    }

    const path = findPath(graph, generatorNode.id, challengeNode.id);
    if (!path) return 0;

    // Calculate total operations by checking for bundled operations
    let totalCount = 0;
    for (const operation of path) {
      // Find the edge that contains this operation to check if it's bundled
      const edge = Object.values(graph.edges).find(e => e.operation.id === operation.id);
      if (edge && edge.bundleCount) {
        totalCount += Number(edge.bundleCount);
      } else {
        totalCount += 1;
      }
    }

    return totalCount;
  }, [graph]);

  // Reset current point when challenge changes
  useEffect(() => {
    resetToChallenge(challenge.public_key);
  }, [challenge.public_key]);

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
    (point: ECPoint) => {
      // Check if this is a saved point
      const savedPoint = savedPoints.find(
        sp =>
          sp.point.x === point.x &&
          sp.point.y === point.y &&
          sp.point.isInfinity === point.isInfinity
      );

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
    [savedPoints, generatorPoint, challenge.public_key]
  );

  const handlePointClick = useCallback(async (point: ECPoint) => {
    setModalPoint(point);
    setShowPointModal(true);

    // Calculate address for the modal point
    if (point.isInfinity) {
      setModalPointAddress('Point at Infinity');
    } else {
      try {
        const pubKey = pointToPublicKey(point);
        const address = await getP2PKHAddress(pubKey);
        setModalPointAddress(address);
      } catch {
        setModalPointAddress('Invalid');
      }
    }
  }, []);

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
            challengePublicKey={challenge.public_key}
            onPointChange={(point, _operation) => {
              setCurrentPoint(point);
            }}
            onError={setError}
            onSavePoint={saveCurrentPoint}
            isLocked={hasWon && !isPracticeMode}
            calculatorDisplayRef={calculatorDisplayRef}
          />
        </div>
      </div>

      <Modal
        isOpen={showPointModal && !!modalPoint}
        onClose={() => setShowPointModal(false)}
        title={(() => {
          if (!modalPoint) return '';

          // Check if this is a saved point first
          const savedPoint = savedPoints.find(
            sp =>
              sp.point.x === modalPoint.x &&
              sp.point.y === modalPoint.y &&
              sp.point.isInfinity === modalPoint.isInfinity
          );
          if (savedPoint) {
            return savedPoint.label;
          }

          // Check if this is the current point
          if (modalPoint.x === currentPoint.x && modalPoint.y === currentPoint.y) {
            return 'Current Point';
          }

          // Check for special points
          const generatorPoint = getGeneratorPoint();
          const challengePoint = publicKeyToPoint(challenge.public_key);

          if (modalPoint.x === generatorPoint.x && modalPoint.y === generatorPoint.y) {
            return 'Generator (G) Point Information';
          } else if (modalPoint.x === challengePoint.x && modalPoint.y === challengePoint.y) {
            return 'Challenge Point Information';
          }

          // Look up point information from the graph
          const node = findNodeByPoint(graph, modalPoint);
          if (node) {
            return `${node.label} Point Information`;
          }

          return 'Point Information';
        })()}
        isPracticeMode={isPracticeMode}
        practicePrivateKey={practicePrivateKey}
        point={modalPoint}
        onLoadPoint={loadPoint}
        onCopyPrivateKeyToCalculator={(privateKey: string) => {
          if (calculatorDisplayRef.current) {
            calculatorDisplayRef.current(privateKey);
          }
        }}
        pointData={
          modalPoint
            ? {
                address: modalPointAddress,
                compressedKey: modalPoint.isInfinity
                  ? '020000000000000000000000000000000000000000000000000000000000000000'
                  : (() => {
                      try {
                        return pointToPublicKey(modalPoint);
                      } catch {
                        return 'Invalid point';
                      }
                    })(),
                xCoordinate: modalPoint.isInfinity
                  ? '0000000000000000000000000000000000000000000000000000000000000000'
                  : bigintToHex(modalPoint.x),
                yCoordinate: modalPoint.isInfinity
                  ? '0000000000000000000000000000000000000000000000000000000000000000'
                  : bigintToHex(modalPoint.y),
                privateKey: (() => {
                  const privateKey = calculatePrivateKeyFromGraph(modalPoint, graph);
                  return privateKey ? bigintToHex(privateKey) : undefined;
                })(),
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
        operationCount={totalOperationCount}
        challengeAddress={challengeAddress}
        victoryPrivateKey={victoryPrivateKey ? '0x' + victoryPrivateKey.toString(16) : ''}
        isPracticeMode={isPracticeMode}
      />
    </div>
  );
};

export default ECCPlayground;
