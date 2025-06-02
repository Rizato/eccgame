import { useState, useCallback, useEffect } from 'react';
import type { ECPoint } from '../utils/ecc';
import type { Operation } from '../components/ECCCalculator';
import { getGeneratorPoint, publicKeyToPoint, pointToPublicKey } from '../utils/ecc';
import { getP2PKHAddress } from '../utils/crypto';

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
    setError(null);
    clearCalculator();
    setLastOperationValue(null);
    setHasWon(false);
    setShowVictoryModal(false);
    setStartingMode('generator');
  }, [generatorPoint, clearCalculator]);

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
  };
}
