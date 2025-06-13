import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useDailyCalculatorRedux } from '../hooks/useDailyCalculatorRedux';
import { usePracticeCalculatorRedux } from '../hooks/usePracticeCalculatorRedux';
import { useAppSelector } from '../store/hooks';
import { getP2PKHAddress, createSignature } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import './ECCPlayground.css';
import {
  calculateChallengePrivateKeyFromGraph,
  findNodeByPoint,
  calculatePrivateKeyFromGraph,
} from '../utils/graphOperations';
import ECCCalculator from './ECCCalculator';
import ECCGraph from './ECCGraph';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
import type { ECPoint } from '../types/ecc';
import type { Challenge } from '../types/game';

interface ECCPlaygroundProps {
  challenge?: Challenge | null;
  isPracticeMode?: boolean;
  practicePrivateKey?: string;
}

const ECCPlayground: React.FC<ECCPlaygroundProps> = ({
  challenge,
  isPracticeMode = false,
  practicePrivateKey,
}) => {
  // Use the appropriate calculator hook based on mode
  const dailyCalculator = useDailyCalculatorRedux(challenge?.public_key || '');
  const practiceCalculator = usePracticeCalculatorRedux(
    challenge?.public_key || '',
    practicePrivateKey || ''
  );

  // Get game state for give up functionality
  const gameState = useAppSelector(state => state.game);

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

  const [showPointModal, setShowPointModal] = useState(false);
  const [modalPoint, setModalPoint] = useState<ECPoint | null>(null);
  const [modalPointAddress, setModalPointAddress] = useState<string>('');
  const [signature, setSignature] = useState<string>('');

  const calculatorDisplayRef = useRef<((value: string) => void) | null>(null);
  const generatorPoint = getGeneratorPoint();

  // Create stable refs for calculator functions to avoid dependency issues
  const calculatorFunctionsRef = useRef({
    resetToChallenge,
    resetToGenerator,
    loadSavedPoint,
  });

  // Update refs when functions change
  useEffect(() => {
    calculatorFunctionsRef.current = {
      resetToChallenge,
      resetToGenerator,
      loadSavedPoint,
    };
  }, [resetToChallenge, resetToGenerator, loadSavedPoint]);

  const victoryPrivateKey = useMemo(() => {
    if (hasWon && challenge) {
      return calculateChallengePrivateKeyFromGraph(challenge, graph);
    }
  }, [hasWon, challenge, graph]);

  useEffect(() => {
    const calculateSignature = async (privateKey: bigint) => {
      const signature = await createSignature(privateKey.toString(16));
      setSignature(signature);
    };
    if (hasWon && victoryPrivateKey !== undefined) {
      calculateSignature(victoryPrivateKey);
    }
  }, [hasWon, victoryPrivateKey]);

  // Calculate total number of operations by summing all bundled edges
  const totalOperationCount = useMemo(() => {
    return Object.values(graph.edges).reduce((total, edge) => {
      return total + (edge.bundleCount ? Number(edge.bundleCount) : 1);
    }, 0);
  }, [graph]);

  // Reset current point when challenge changes
  useEffect(() => {
    if (challenge) {
      calculatorFunctionsRef.current.resetToChallenge(challenge.public_key);
    }
  }, [challenge]);

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
        calculatorFunctionsRef.current.loadSavedPoint(savedPoint);
      } else {
        // Loading a base point (generator or challenge)
        const isGenerator = point.x === generatorPoint.x && point.y === generatorPoint.y;
        if (isGenerator) {
          calculatorFunctionsRef.current.resetToGenerator();
        } else if (challenge) {
          calculatorFunctionsRef.current.resetToChallenge(challenge.public_key);
        }
      }
    },
    [savedPoints, generatorPoint.x, generatorPoint.y, challenge]
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

  // Handle loading state - show empty interface when challenge is not available
  if (!challenge) {
    return (
      <div className="ecc-playground">
        <div className="playground-content">
          <div className="graph-calculator-integrated">
            <ECCGraph challengePublicKey="" onPointClick={() => {}} operationCount={0} />
            <ECCCalculator
              currentPoint={{ x: 0n, y: 0n, isInfinity: true }}
              challengePublicKey=""
              onPointChange={() => {}}
              onError={() => {}}
              onSavePoint={() => {}}
              isLocked={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ecc-playground">
      {error && <div className="error-message">{error}</div>}

      <div className="playground-content">
        {/* Integrated Graph-Calculator Layout */}
        <div className="graph-calculator-integrated">
          {/* ECC Graph Visualization */}
          <ECCGraph
            challengePublicKey={challenge.public_key}
            onPointClick={handlePointClick}
            operationCount={totalOperationCount}
          />

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
          if (modalPoint.x === generatorPoint.x && modalPoint.y === generatorPoint.y) {
            return 'Generator (G) Point Information';
          }

          if (challenge) {
            const challengePoint = publicKeyToPoint(challenge.public_key);
            if (modalPoint.x === challengePoint.x && modalPoint.y === challengePoint.y) {
              return 'Challenge Point Information';
            }
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
        }}
        savedPoints={savedPoints}
        operationCount={totalOperationCount}
        victoryPrivateKey={victoryPrivateKey ? '0x' + victoryPrivateKey.toString(16) : ''}
        signature={signature}
        isPracticeMode={isPracticeMode}
        gaveUp={gameState.gaveUp}
        challenge={challenge}
      />
    </div>
  );
};

export default ECCPlayground;
