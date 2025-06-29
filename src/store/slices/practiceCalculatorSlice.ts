import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { type ECPoint, type SavedPoint, type SingleOperationPayload } from '../../types/ecc';
import { getP2PKHAddress } from '../../utils/crypto';
import { getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../../utils/ecc';
import {
  addCachedNode,
  addCachedOperation,
  getCachedGraph,
  clearCachedGraph,
  findCachedNodeByPoint,
} from '../../utils/graphCache';
import { calculatePrivateKeyFromGraph } from '../../utils/graphOperations';
import { savePracticeState, loadPracticeState } from '../../utils/storage';
import { processBatchOperations } from './utils/batchOperations';

export interface PracticeCalculatorState {
  selectedPoint: ECPoint;
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
  userOperationCount: number;
}

const generatorPoint = getGeneratorPoint();

// Initialize cached graph with generator point
const initializePracticeCachedGraph = (): string => {
  const mode = 'practice';
  clearCachedGraph(mode);
  const generatorNode = addCachedNode(mode, generatorPoint, {
    id: 'practice_generator',
    label: 'Generator (G)',
    privateKey: 1n,
    isGenerator: true,
    connectedToG: true,
  });
  return generatorNode.id;
};

const initialPracticeGeneratorNodeId = initializePracticeCachedGraph();

const initialState: PracticeCalculatorState = {
  selectedPoint: generatorPoint,
  generatorNodeId: initialPracticeGeneratorNodeId,
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
  userOperationCount: 0,
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
      // Keep selectedPoint as generator point G, don't change to challenge point

      // Add challenge node to graph with known private key (only if privateKey is valid)
      const nodeOptions: {
        id: string;
        label: string;
        isChallenge: boolean;
        privateKey?: bigint;
      } = {
        id: 'practice_challenge',
        label: 'Challenge Point',
        isChallenge: true,
      };

      // Only add private key if it's a valid hex string
      if (privateKey && privateKey.length > 0 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        try {
          nodeOptions.privateKey = BigInt('0x' + privateKey);
        } catch {
          console.warn('Invalid private key format:', privateKey);
        }
      }

      const challengeNode = addCachedNode('practice', challengePoint, nodeOptions);
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
      const nodeOptions: {
        id: string;
        label: string;
        isChallenge: boolean;
        privateKey?: bigint;
      } = {
        id: 'practice_challenge',
        label: 'Challenge Point',
        isChallenge: true,
      };

      // Only add private key if it's a valid hex string
      if (privateKey && privateKey.length > 0 && /^[0-9a-fA-F]+$/.test(privateKey)) {
        try {
          nodeOptions.privateKey = BigInt('0x' + privateKey);
        } catch {
          console.warn('Invalid private key format:', privateKey);
        }
      }

      const challengeNode = addCachedNode('practice', challengePoint, nodeOptions);
      state.challengeNodeId = challengeNode.id;

      // Don't clear saved points when switching to challenge
      state.challengePublicKey = publicKey;
      state.practicePrivateKey = privateKey;
    },
    resetToGenerator: state => {
      state.selectedPoint = generatorPoint;

      // Ensure generator node exists in cached graph
      const generatorNode = addCachedNode('practice', generatorPoint, {
        id: 'practice_generator',
        label: 'Generator (G)',
        privateKey: 1n,
        isGenerator: true,
        connectedToG: true,
      });
      state.generatorNodeId = generatorNode.id;
    },
    clearPracticeState: state => {
      // Reset cached graph and state
      const resetGeneratorNodeId = initializePracticeCachedGraph();
      state.selectedPoint = generatorPoint;
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
      state.userOperationCount = 0;
      // Keep challengePublicKey and practicePrivateKey as they'll be set by the new wallet
    },
    savePoint: (state, action: PayloadAction<{ label?: string }>) => {
      const { label } = action.payload;

      // Find the current point's private key from the cached graph
      const currentNode = findCachedNodeByPoint('practice', state.selectedPoint);

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        label: label || `Saved Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
        privateKey: currentNode?.privateKey,
      };

      state.savedPoints.push(savedPoint);
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const savedPoint = action.payload;
      state.selectedPoint = savedPoint.point;

      // Add the saved point to the cached graph if it doesn't exist, including its private key
      const node = addCachedNode('practice', savedPoint.point, {
        id: savedPoint.id,
        label: savedPoint.label,
        privateKey: savedPoint.privateKey,
      });

      // If the saved point doesn't have a private key, try to calculate it from the graph
      if (!node.privateKey) {
        const graph = getCachedGraph('practice');
        const calculatedKey = calculatePrivateKeyFromGraph(node.point, graph);
        if (calculatedKey) {
          node.privateKey = calculatedKey;
        }
      }

      // Clean up dangling nodes and edges when loading a point
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
    },
    unsaveSavedPoint: (state, action: PayloadAction<string>) => {
      const pointId = action.payload;

      // Remove from saved points
      state.savedPoints = state.savedPoints.filter(point => point.id !== pointId);
    },
    checkWinCondition: state => {
      // Win condition: challenge node is connected to generator (has connectedToG property)
      if (state.challengeNodeId && state.generatorNodeId) {
        const graph = getCachedGraph('practice');
        const challengeNode = graph.nodes.get(state.challengeNodeId);

        if (challengeNode?.connectedToG && !state.hasWon) {
          state.hasWon = true;
          state.showVictoryModal = true;
        }
      }
    },
    addOperationToGraph: (state, action: PayloadAction<SingleOperationPayload>) => {
      const { fromPoint, toPoint, operation } = action.payload;
      addCachedOperation('practice', fromPoint, toPoint, operation);
      // Update selected point to the result
      state.selectedPoint = toPoint;
      // Increment operation count if this is a user-created operation
      if (operation.userCreated) {
        state.userOperationCount += 1;
      }
    },
    addBatchOperationsToGraph: (state, action: PayloadAction<SingleOperationPayload[]>) => {
      const operations = action.payload;
      const graph = getCachedGraph('practice');
      processBatchOperations(graph, operations, 'practice');
      // Count user-created operations in the batch
      const userOperationCount = operations.filter(op => op.operation.userCreated).length;
      if (userOperationCount > 0) {
        state.userOperationCount += userOperationCount;
      }
    },
    saveState: state => {
      // Save current state to localStorage
      savePracticeState(state);
    },
    loadState: state => {
      // Load state from localStorage
      const saved = loadPracticeState();
      if (saved) {
        Object.assign(state, saved);
      }
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
  unsaveSavedPoint,
  checkWinCondition,
  addOperationToGraph,
  addBatchOperationsToGraph,
  saveState,
  loadState,
} = practiceCalculatorSlice.actions;

export default practiceCalculatorSlice.reducer;
