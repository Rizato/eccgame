import { useCallback, useEffect, useState } from 'react';
import { getP2PKHAddress } from '../utils/crypto';
import { getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../utils/ecc';
import { type SavedPoint } from '../utils/privateKeyCalculation';
import type { Operation } from '../components/ECCCalculator';
import type { ECPoint } from '../utils/ecc';

export type StartingMode = 'challenge' | 'generator';

interface ECCCalculatorState {
  currentPoint: ECPoint;
  operations: Operation[];
  error: string | null;
  currentAddress: string;
  calculatorDisplay: string;
  pendingOperation: 'multiply' | 'divide' | 'add' | 'subtract' | null;
  lastOperationValue: string | null;
  hexMode: boolean;
  startingMode: StartingMode;
  hasWon: boolean;
  showVictoryModal: boolean;
  savedPoints: SavedPoint[];
  currentSavedPoint: SavedPoint | null;
}

interface ECCCalculatorActions {
  setCurrentPoint: (point: ECPoint) => void;
  setOperations: (operations: Operation[]) => void;
  setError: (error: string | null) => void;
  setStartingMode: (mode: StartingMode) => void;
  setHasWon: (hasWon: boolean) => void;
  setShowVictoryModal: (show: boolean) => void;
  clearCalculator: () => void;
  addToCalculator: (value: string) => void;
  backspaceCalculator: () => void;
  resetToChallenge: (challengePublicKey: string) => void;
  resetToGenerator: () => void;
  savePoint: (label?: string) => void;
  loadSavedPoint: (savedPoint: SavedPoint) => void;
}

export function useECCCalculator(
  challengePublicKey: string,
  isPracticeMode: boolean = false
): ECCCalculatorState & ECCCalculatorActions {
  const [currentPoint, setCurrentPoint] = useState<ECPoint>(() =>
    publicKeyToPoint(challengePublicKey)
  );
  const [operations, setOperations] = useState<Operation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [calculatorDisplay, setCalculatorDisplay] = useState('');
  const [pendingOperation, setPendingOperation] = useState<
    'multiply' | 'divide' | 'add' | 'subtract' | null
  >(null);
  const [lastOperationValue, setLastOperationValue] = useState<string | null>(null);
  const [hexMode, setHexMode] = useState(false);
  const [startingMode, setStartingMode] = useState<StartingMode>('challenge');
  const [hasWon, setHasWon] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [savedPoints, setSavedPoints] = useState<SavedPoint[]>([]);
  const [currentSavedPoint, setCurrentSavedPoint] = useState<SavedPoint | null>(null);

  const generatorPoint = getGeneratorPoint();
  const challengePoint = publicKeyToPoint(challengePublicKey);

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

  const resetToChallenge = useCallback(
    (challengePublicKey: string) => {
      setCurrentPoint(publicKeyToPoint(challengePublicKey));
      setOperations([]);
      setSavedPoints([]);
      setCurrentSavedPoint(null);
      setError(null);
      clearCalculator();
      setLastOperationValue(null);
      setHasWon(false);
      setShowVictoryModal(false);
      setStartingMode('challenge');
    },
    [clearCalculator]
  );

  const resetToGenerator = useCallback(() => {
    setCurrentPoint(generatorPoint);
    setOperations([]);
    setSavedPoints([]);
    setCurrentSavedPoint(null);
    setError(null);
    clearCalculator();
    setLastOperationValue(null);
    setHasWon(false);
    setShowVictoryModal(false);
    setStartingMode('generator');
  }, [generatorPoint, clearCalculator]);

  const savePoint = useCallback(
    (label?: string) => {
      const startingPoint = currentSavedPoint
        ? currentSavedPoint.point
        : startingMode === 'challenge'
          ? challengePoint
          : generatorPoint;

      const allOperations = currentSavedPoint
        ? [...currentSavedPoint.operations, ...operations]
        : operations;

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: currentPoint,
        startingPoint,
        startingMode: currentSavedPoint ? currentSavedPoint.startingMode : startingMode,
        operations: allOperations,
        label: label || `Point ${savedPoints.length + 1}`,
        timestamp: Date.now(),
      };

      setSavedPoints(prev => [...prev, savedPoint]);
    },
    [
      currentPoint,
      operations,
      savedPoints,
      startingMode,
      challengePoint,
      generatorPoint,
      currentSavedPoint,
    ]
  );

  const loadSavedPoint = useCallback(
    (savedPoint: SavedPoint) => {
      setCurrentPoint(savedPoint.point);
      setOperations([]);
      setCurrentSavedPoint(savedPoint);
      setStartingMode(savedPoint.startingMode);
      setError(null);
      clearCalculator();
      setLastOperationValue(null);
      setHasWon(false);
      setShowVictoryModal(false);
    },
    [clearCalculator]
  );

  // Win condition detection
  useEffect(() => {
    const isAtGenerator =
      currentPoint.x === generatorPoint.x &&
      currentPoint.y === generatorPoint.y &&
      !currentPoint.isInfinity;

    const isAtChallengePoint =
      currentPoint.x === challengePoint.x &&
      currentPoint.y === challengePoint.y &&
      !currentPoint.isInfinity;

    const isAtInfinity = currentPoint.isInfinity;

    const hasWonRound = (() => {
      if (startingMode === 'challenge') {
        // Challenge -> G: win on generator point or infinity
        return isAtGenerator || isAtInfinity;
      } else {
        // G -> Challenge: win on challenge point or infinity
        return isAtChallengePoint || isAtInfinity;
      }
    })();

    if (hasWonRound && !hasWon) {
      setHasWon(true);
      setShowVictoryModal(true);
    }
  }, [currentPoint, generatorPoint, challengePoint, startingMode, hasWon]);

  // Calculate current address
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

  // Reset when challenge changes
  useEffect(() => {
    resetToChallenge(challengePublicKey);
  }, [challengePublicKey, resetToChallenge]);

  return {
    // State
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
    // Actions
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
  };
}
