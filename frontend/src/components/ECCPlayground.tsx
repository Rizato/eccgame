import React, { useCallback, useEffect, useState, useRef } from 'react';
import type { Challenge } from '../types/game';
import { useDailyCalculatorRedux } from '../hooks/useDailyCalculatorRedux';
import { usePracticeCalculatorRedux } from '../hooks/usePracticeCalculatorRedux';
import { useAppSelector } from '../store/hooks';
import { getP2PKHAddress } from '../utils/crypto';
import { bigintToHex, getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import './ECCPlayground.css';
import { findNodeByPoint, calculatePrivateKeyFromGraph } from '../utils/graphOperations';
import ECCCalculator from './ECCCalculator';
import ECCGraph from './ECCGraph';
import { Modal } from './Modal';
import { VictoryModal } from './VictoryModal';
import type { ECPoint } from '../types/ecc';

interface ECCPlaygroundProps {
  isPracticeMode?: boolean;
}

const ECCPlayground: React.FC<ECCPlaygroundProps> = ({ isPracticeMode = false }) => {
  // Get challenge from Redux state based on mode
  const dailyChallenge = useAppSelector(state => state.game.challenge);
  const practiceChallenge = useAppSelector(
    state =>
      ({
        id: state.practiceMode.challengeId,
        p2pkh_address: state.practiceMode.challengeAddress,
        public_key: state.practiceMode.challengePublicKey,
        tags: state.practiceMode.challengeTags,
      }) as Challenge
  );
  const practicePrivateKey = useAppSelector(state => state.practiceMode.practicePrivateKey);

  const challenge = isPracticeMode ? practiceChallenge : dailyChallenge;

  if (!challenge || !challenge.public_key) {
    return null;
  }

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
    savedPoints,
    graph,
    setCurrentPoint,
    setError,
    resetToChallenge,
    resetToGenerator,
    savePoint,
    loadSavedPoint,
  } = calculator;

  const [showPointModal, setShowPointModal] = useState(false);
  const [modalPoint, setModalPoint] = useState<ECPoint | null>(null);
  const [modalPointAddress, setModalPointAddress] = useState<string>('');

  const calculatorDisplayRef = useRef<((value: string) => void) | null>(null);
  const generatorPoint = getGeneratorPoint();

  // Reset current point when challenge changes
  useEffect(() => {
    resetToChallenge(challenge.public_key);
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

      <VictoryModal />
    </div>
  );
};

export default ECCPlayground;
