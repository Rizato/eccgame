import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import { getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../../utils/ecc';
import type { ECPoint, Operation, SavedPoint, PointGraph } from '../../types/ecc';
import { createEmptyGraph, addNode, hasPath } from '../../utils/pointGraph';
import { ensureOperationInGraph } from '../../utils/ensureOperationInGraph';
import { optimizeGraphWithBundling } from '../../utils/operationBundling';

interface PracticeCalculatorState {
  selectedPoint: ECPoint;
  graph: PointGraph;
  generatorNodeId: string | null;
  challengeNodeId: string | null;
  error: string | null;
  currentAddress: string;
  calculatorDisplay: string;
  pendingOperation: 'multiply' | 'divide' | 'add' | 'subtract' | null;
  lastOperationValue: string | null;
  hexMode: boolean;
  hasWon: boolean;
  showVictoryModal: boolean;
  savedPoints: SavedPoint[];
  challengePublicKey: string;
  practicePrivateKey: string;
}

const generatorPoint = getGeneratorPoint();

// Initialize graph with generator point
const initializeGraph = (): { graph: PointGraph; generatorNodeId: string } => {
  const graph = createEmptyGraph();
  const generatorNode = addNode(graph, generatorPoint, {
    id: 'generator',
    label: 'Generator (G)',
    privateKey: 1n,
    isGenerator: true,
  });
  return { graph, generatorNodeId: generatorNode.id };
};

const { graph: initialGraph, generatorNodeId: initialGeneratorNodeId } = initializeGraph();

const initialState: PracticeCalculatorState = {
  selectedPoint: generatorPoint,
  graph: initialGraph,
  generatorNodeId: initialGeneratorNodeId,
  challengeNodeId: null,
  error: null,
  currentAddress: '',
  calculatorDisplay: '',
  pendingOperation: null,
  lastOperationValue: null,
  hexMode: false,
  hasWon: false,
  showVictoryModal: false,
  savedPoints: [],
  challengePublicKey: '',
  practicePrivateKey: '',
};

// Async thunk for calculating current address
export const calculatePracticeCurrentAddress = createAsyncThunk(
  'practiceCalculator/calculateCurrentAddress',
  async (point: ECPoint) => {
    if (point.isInfinity) {
      return 'Point at Infinity';
    }

    try {
      const pubKey = pointToPublicKey(point);
      const address = await getP2PKHAddress(pubKey);
      return address;
    } catch {
      return 'Invalid';
    }
  }
);

const practiceCalculatorSlice = createSlice({
  name: 'practiceCalculator',
  initialState,
  reducers: {
    setSelectedPoint: (state, action: PayloadAction<ECPoint>) => {
      state.selectedPoint = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setHasWon: (state, action: PayloadAction<boolean>) => {
      state.hasWon = action.payload;
    },
    setShowVictoryModal: (state, action: PayloadAction<boolean>) => {
      state.showVictoryModal = action.payload;
    },
    setPendingOperation: (
      state,
      action: PayloadAction<'multiply' | 'divide' | 'add' | 'subtract' | null>
    ) => {
      state.pendingOperation = action.payload;
    },
    setChallengeWithPrivateKey: (
      state,
      action: PayloadAction<{ publicKey: string; privateKey: string }>
    ) => {
      const { publicKey, privateKey } = action.payload;
      state.challengePublicKey = publicKey;
      state.practicePrivateKey = privateKey;
      const challengePoint = publicKeyToPoint(publicKey);
      state.selectedPoint = challengePoint;

      // Add challenge node to graph with known private key (only if privateKey is valid)
      const nodeOptions: any = {
        id: 'challenge',
        label: 'Challenge Point',
        isChallenge: true,
      };

      // Only add private key if it's a valid hex string
      if (privateKey && privateKey.length > 0 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        try {
          nodeOptions.privateKey = BigInt('0x' + privateKey);
        } catch (error) {
          console.warn('Invalid private key format:', privateKey);
        }
      }

      const challengeNode = addNode(state.graph, challengePoint, nodeOptions);
      state.challengeNodeId = challengeNode.id;
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
    resetToChallengeWithPrivateKey: (
      state,
      action: PayloadAction<{ publicKey: string; privateKey: string }>
    ) => {
      const { publicKey, privateKey } = action.payload;
      const challengePoint = publicKeyToPoint(publicKey);
      state.selectedPoint = challengePoint;

      // Ensure challenge node exists in graph with known private key
      const nodeOptions: any = {
        id: 'challenge',
        label: 'Challenge Point',
        isChallenge: true,
      };

      // Only add private key if it's a valid hex string
      if (privateKey && privateKey.length > 0 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        try {
          nodeOptions.privateKey = BigInt('0x' + privateKey);
        } catch (error) {
          console.warn('Invalid private key format:', privateKey);
        }
      }

      const challengeNode = addNode(state.graph, challengePoint, nodeOptions);
      state.challengeNodeId = challengeNode.id;

      // Don't clear saved points when switching to challenge
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.challengePublicKey = publicKey;
      state.practicePrivateKey = privateKey;
    },
    resetToGenerator: state => {
      state.selectedPoint = generatorPoint;

      // Ensure generator node exists in graph (don't clear the graph, just ensure the node exists)
      const generatorNode = addNode(state.graph, generatorPoint, {
        id: 'generator',
        label: 'Generator (G)',
        privateKey: 1n,
        isGenerator: true,
      });
      state.generatorNodeId = generatorNode.id;

      // Don't clear saved points when switching to generator
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
    },
    clearPracticeState: state => {
      // Reset to initial state but keep the generator point
      const { graph: resetGraph, generatorNodeId: resetGeneratorNodeId } = initializeGraph();
      state.selectedPoint = generatorPoint;
      state.graph = resetGraph;
      state.generatorNodeId = resetGeneratorNodeId;
      state.challengeNodeId = null;
      state.error = null;
      state.currentAddress = '';
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.lastOperationValue = null;
      state.hexMode = false;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.savedPoints = [];
      // Keep challengePublicKey and practicePrivateKey as they'll be set by the new challenge
    },
    savePoint: (state, action: PayloadAction<{ label?: string }>) => {
      const { label } = action.payload;

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        label: label || `Saved Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
      };

      state.savedPoints.push(savedPoint);

      // Automatically optimize graph after saving a point
      state.graph = optimizeGraphWithBundling(state.graph, state.savedPoints);
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      state.selectedPoint = action.payload.point;
    },
    checkWinCondition: state => {
      // Win condition: there's a path from challenge to generator in the graph
      if (state.challengeNodeId && state.generatorNodeId) {
        const hasConnection = hasPath(state.graph, state.challengeNodeId, state.generatorNodeId);

        if (hasConnection && !state.hasWon) {
          state.hasWon = true;
          state.showVictoryModal = true;
        }
      }
    },
    addOperationToGraph: (
      state,
      action: PayloadAction<{
        fromPoint: ECPoint;
        toPoint: ECPoint;
        operation: Operation;
      }>
    ) => {
      const { fromPoint, toPoint, operation } = action.payload;
      ensureOperationInGraph(state.graph, fromPoint, toPoint, operation);

      // Update selected point to the result
      state.selectedPoint = toPoint;
    },
    optimizeGraph: state => {
      state.graph = optimizeGraphWithBundling(state.graph, state.savedPoints);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(calculatePracticeCurrentAddress.fulfilled, (state, action) => {
        state.currentAddress = action.payload;
      })
      .addCase(calculatePracticeCurrentAddress.rejected, state => {
        state.currentAddress = 'Invalid';
      });
  },
});

export const {
  setSelectedPoint,
  setError,
  setHasWon,
  setShowVictoryModal,
  setPendingOperation,
  setChallengeWithPrivateKey,
  clearCalculator,
  addToCalculator,
  backspaceCalculator,
  resetToChallengeWithPrivateKey,
  resetToGenerator,
  clearPracticeState,
  savePoint,
  loadSavedPoint,
  optimizeGraph,
  checkWinCondition,
  addOperationToGraph,
} = practiceCalculatorSlice.actions;

export default practiceCalculatorSlice.reducer;
