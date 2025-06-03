import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import { getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../../utils/ecc';
import { type SavedPoint } from '../../utils/privateKeyCalculation';
import type { Operation } from '../../components/ECCCalculator';
import type { ECPoint } from '../../utils/ecc';

export type StartingMode = 'challenge' | 'generator';

interface ECCCalculatorState {
  selectedPoint: ECPoint;
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
  startingPoint: SavedPoint | null;
  challengePublicKey: string;
}

const generatorPoint = getGeneratorPoint();

const initialState: ECCCalculatorState = {
  selectedPoint: generatorPoint,
  operations: [],
  error: null,
  currentAddress: '',
  calculatorDisplay: '',
  pendingOperation: null,
  lastOperationValue: null,
  hexMode: false,
  startingMode: 'challenge',
  hasWon: false,
  showVictoryModal: false,
  savedPoints: [],
  startingPoint: null,
  challengePublicKey: '',
};

export const calculateCurrentAddress = createAsyncThunk(
  'eccCalculator/calculateCurrentAddress',
  async (currentPoint: ECPoint) => {
    if (currentPoint.isInfinity) {
      return 'Point at Infinity';
    }

    try {
      const pubKey = pointToPublicKey(currentPoint);
      const address = await getP2PKHAddress(pubKey);
      return address;
    } catch {
      return 'Invalid';
    }
  }
);

const eccCalculatorSlice = createSlice({
  name: 'eccCalculator',
  initialState,
  reducers: {
    setSelectedPoint: (state, action: PayloadAction<ECPoint>) => {
      state.selectedPoint = action.payload;
    },
    setOperations: (state, action: PayloadAction<Operation[]>) => {
      state.operations = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStartingMode: (state, action: PayloadAction<StartingMode>) => {
      state.startingMode = action.payload;
    },
    setHasWon: (state, action: PayloadAction<boolean>) => {
      state.hasWon = action.payload;
    },
    setShowVictoryModal: (state, action: PayloadAction<boolean>) => {
      state.showVictoryModal = action.payload;
    },
    setCalculatorDisplay: (state, action: PayloadAction<string>) => {
      state.calculatorDisplay = action.payload;
    },
    setPendingOperation: (
      state,
      action: PayloadAction<'multiply' | 'divide' | 'add' | 'subtract' | null>
    ) => {
      state.pendingOperation = action.payload;
    },
    setLastOperationValue: (state, action: PayloadAction<string | null>) => {
      state.lastOperationValue = action.payload;
    },
    setHexMode: (state, action: PayloadAction<boolean>) => {
      state.hexMode = action.payload;
    },
    setSavedPoints: (state, action: PayloadAction<SavedPoint[]>) => {
      state.savedPoints = action.payload;
    },
    setStartingPoint: (state, action: PayloadAction<SavedPoint | null>) => {
      state.startingPoint = action.payload;
    },
    setChallengePublicKey: (state, action: PayloadAction<string>) => {
      state.challengePublicKey = action.payload;
      state.selectedPoint = publicKeyToPoint(action.payload);
    },
    clearCalculator: state => {
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
    },
    addToCalculator: (state, action: PayloadAction<string>) => {
      const value = action.payload;
      const isHexDigit = /^[A-F]$/i.test(value);

      const newValue = state.calculatorDisplay + value;

      // Auto-enable hex mode if we're adding hex digits
      if (isHexDigit && !state.calculatorDisplay.startsWith('0x')) {
        state.hexMode = true;
        state.calculatorDisplay = '0x' + newValue;
      } else {
        state.calculatorDisplay = newValue;
      }
    },
    backspaceCalculator: state => {
      const newValue = state.calculatorDisplay.slice(0, -1);

      // If we removed the last character after 0x, remove the 0x too
      if (newValue === '0x') {
        state.hexMode = false;
        state.calculatorDisplay = '';
      } else {
        state.calculatorDisplay = newValue;

        // Update hex mode state based on current value
        if (!newValue.startsWith('0x') && state.hexMode) {
          state.hexMode = false;
        } else if (newValue.startsWith('0x') && !state.hexMode) {
          state.hexMode = true;
        }
      }
    },
    resetToChallenge: (state, action: PayloadAction<string>) => {
      const challengePublicKey = action.payload;
      state.selectedPoint = publicKeyToPoint(challengePublicKey);
      state.operations = [];
      state.savedPoints = [];
      state.startingPoint = null;
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.startingMode = 'challenge';
      state.challengePublicKey = challengePublicKey;
    },
    resetToGenerator: state => {
      state.selectedPoint = generatorPoint;
      state.operations = [];
      state.savedPoints = [];
      state.startingPoint = null;
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.startingMode = 'generator';
    },
    savePoint: (state, action: PayloadAction<{ label?: string }>) => {
      const { label } = action.payload;
      const challengePoint = state.challengePublicKey
        ? publicKeyToPoint(state.challengePublicKey)
        : generatorPoint;

      const startingPoint = state.startingPoint
        ? state.startingPoint.point
        : state.startingMode === 'challenge'
          ? challengePoint
          : generatorPoint;

      const allOperations = state.startingPoint
        ? [...state.startingPoint.operations, ...state.operations]
        : state.operations;

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        startingPoint,
        startingMode: state.startingPoint ? state.startingPoint.startingMode : state.startingMode,
        operations: allOperations,
        label: label || `Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
      };

      state.savedPoints.push(savedPoint);
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const savedPoint = action.payload;
      state.selectedPoint = savedPoint.point;
      state.operations = [];
      state.startingPoint = savedPoint;
      state.startingMode = savedPoint.startingMode;
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
    },
    checkWinCondition: state => {
      const challengePoint = state.challengePublicKey
        ? publicKeyToPoint(state.challengePublicKey)
        : null;

      const isAtGenerator =
        state.selectedPoint.x === generatorPoint.x &&
        state.selectedPoint.y === generatorPoint.y &&
        !state.selectedPoint.isInfinity;

      const isAtChallengePoint =
        challengePoint &&
        state.selectedPoint.x === challengePoint.x &&
        state.selectedPoint.y === challengePoint.y &&
        !state.selectedPoint.isInfinity;

      const isAtInfinity = state.selectedPoint.isInfinity;

      const hasWonRound = (() => {
        if (state.startingMode === 'challenge') {
          // Challenge -> G: win on generator point or infinity
          return isAtGenerator || isAtInfinity;
        } else {
          // G -> Challenge: win on challenge point or infinity
          return isAtChallengePoint || isAtInfinity;
        }
      })();

      if (hasWonRound && !state.hasWon) {
        state.hasWon = true;
        state.showVictoryModal = true;
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(calculateCurrentAddress.fulfilled, (state, action) => {
        state.currentAddress = action.payload;
      })
      .addCase(calculateCurrentAddress.rejected, state => {
        state.currentAddress = 'Invalid';
      });
  },
});

export const {
  setSelectedPoint,
  setOperations,
  setError,
  setStartingMode,
  setHasWon,
  setShowVictoryModal,
  setCalculatorDisplay,
  setPendingOperation,
  setLastOperationValue,
  setHexMode,
  setSavedPoints,
  setStartingPoint,
  setChallengePublicKey,
  clearCalculator,
  addToCalculator,
  backspaceCalculator,
  resetToChallenge,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  checkWinCondition,
} = eccCalculatorSlice.actions;

export default eccCalculatorSlice.reducer;
