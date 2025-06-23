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
  exportCachedGraphForRedux,
} from '../../utils/graphCache';
import { calculatePrivateKeyFromGraph } from '../../utils/graphOperations';
import { saveDailyState, loadDailyState } from '../../utils/storage';
import { processBatchOperations } from './utils/batchOperations';

export interface DailyCalculatorState {
  selectedPoint: ECPoint;
  graphStats: { nodeCount: number; edgeCount: number; hasNodes: boolean };
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
  shouldSubmitSolution: boolean;
}

const generatorPoint = getGeneratorPoint();

// Initialize cached graph with generator point
const initializeCachedGraph = (): string => {
  const mode = 'daily';
  clearCachedGraph(mode);
  const generatorNode = addCachedNode(mode, generatorPoint, {
    id: 'daily_generator',
    label: 'Generator (G)',
    privateKey: 1n,
    isGenerator: true,
    connectedToG: true,
  });
  return generatorNode.id;
};

const initialGeneratorNodeId = initializeCachedGraph();

const initialState: DailyCalculatorState = {
  selectedPoint: generatorPoint,
  graphStats: exportCachedGraphForRedux('daily'),
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
  shouldSubmitSolution: false,
};

export const calculateDailyCurrentAddress = createAsyncThunk(
  'dailyCalculator/calculateCurrentAddress',
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

const dailyCalculatorSlice = createSlice({
  name: 'dailyCalculator',
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
    setChallengePublicKey: (state, action: PayloadAction<string>) => {
      state.challengePublicKey = action.payload;
      const challengePoint = publicKeyToPoint(action.payload);
      // Keep selectedPoint as generator point G, don't change to challenge point

      // Add challenge node to cached graph
      const challengeNode = addCachedNode('daily', challengePoint, {
        id: 'daily_challenge',
        label: 'Challenge Point',
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;
      state.graphStats = exportCachedGraphForRedux('daily');
    },
    setChallengeWithPrivateKey: (
      state,
      action: PayloadAction<{ publicKey: string; privateKey: string }>
    ) => {
      const { publicKey, privateKey } = action.payload;
      state.challengePublicKey = publicKey;
      const challengePoint = publicKeyToPoint(publicKey);
      // Keep selectedPoint as generator point G, don't change to challenge point

      // Add challenge node to cached graph with known private key
      const challengeNode = addCachedNode('daily', challengePoint, {
        id: 'daily_challenge',
        label: 'Challenge Point',
        privateKey: BigInt('0x' + privateKey),
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;
      state.graphStats = exportCachedGraphForRedux('daily');
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
      const challengePoint = publicKeyToPoint(challengePublicKey);
      state.selectedPoint = challengePoint;

      // Ensure challenge node exists in cached graph
      const challengeNode = addCachedNode('daily', challengePoint, {
        id: 'daily_challenge',
        label: 'Challenge Point',
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;
      state.graphStats = exportCachedGraphForRedux('daily');

      // Don't clear saved points when switching to challenge
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.challengePublicKey = challengePublicKey;
    },
    resetToChallengeWithPrivateKey: (
      state,
      action: PayloadAction<{ publicKey: string; privateKey: string }>
    ) => {
      const { publicKey, privateKey } = action.payload;
      const challengePoint = publicKeyToPoint(publicKey);
      state.selectedPoint = challengePoint;

      // Ensure challenge node exists in cached graph with known private key
      const challengeNode = addCachedNode('daily', challengePoint, {
        id: 'daily_challenge',
        label: 'Challenge Point',
        privateKey: BigInt('0x' + privateKey),
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;
      state.graphStats = exportCachedGraphForRedux('daily');

      // Don't clear saved points when switching to challenge
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.challengePublicKey = publicKey;
    },
    resetToGenerator: state => {
      state.selectedPoint = generatorPoint;

      // Ensure generator node exists in cached graph
      const generatorNode = addCachedNode('daily', generatorPoint, {
        id: 'generator',
        label: 'Generator (G)',
        privateKey: 1n,
        isGenerator: true,
        connectedToG: true,
      });
      state.generatorNodeId = generatorNode.id;
      state.graphStats = exportCachedGraphForRedux('daily');

      // Don't clear saved points when switching to generator
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
    },
    savePoint: (state, action: PayloadAction<{ label?: string }>) => {
      const { label } = action.payload;

      // Find the current point's private key from the cached graph
      const currentNode = findCachedNodeByPoint('daily', state.selectedPoint);

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        label: label || `Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
        privateKey: currentNode?.privateKey,
      };

      state.savedPoints.push(savedPoint);
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const savedPoint = action.payload;
      state.selectedPoint = savedPoint.point;

      // Add the saved point to the cached graph if it doesn't exist, including its private key
      const node = addCachedNode('daily', savedPoint.point, {
        id: savedPoint.id,
        label: savedPoint.label,
        privateKey: savedPoint.privateKey,
      });

      // If the saved point doesn't have a private key, try to calculate it from the graph
      if (!node.privateKey) {
        const graph = getCachedGraph('daily');
        const calculatedKey = calculatePrivateKeyFromGraph(node.point, graph);
        if (calculatedKey) {
          node.privateKey = calculatedKey;
        }
      }

      state.graphStats = exportCachedGraphForRedux('daily');
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
        const graph = getCachedGraph('daily');
        const challengeNode = graph.nodes[state.challengeNodeId];
        if (challengeNode?.connectedToG && !state.hasWon) {
          state.hasWon = true;
          state.showVictoryModal = true;
        }
      }
    },
    addOperationToGraph: (state, action: PayloadAction<SingleOperationPayload>) => {
      // Single operation: use cached graph processing
      const { fromPoint, toPoint, operation } = action.payload;
      addCachedOperation('daily', fromPoint, toPoint, operation);
      // Update selected point to the result
      state.selectedPoint = toPoint;
      state.graphStats = exportCachedGraphForRedux('daily');
    },
    addBatchOperationsToGraph: (state, action: PayloadAction<SingleOperationPayload[]>) => {
      const operations = action.payload;
      const graph = getCachedGraph('daily');
      processBatchOperations(graph, operations, 'daily');
      state.graphStats = exportCachedGraphForRedux('daily');
    },
    saveState: state => {
      // Save current state to localStorage
      saveDailyState(state);
    },
    loadState: state => {
      // Load state from localStorage
      const saved = loadDailyState();
      if (saved) {
        Object.assign(state, saved);
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(calculateDailyCurrentAddress.fulfilled, (state, action) => {
        state.currentAddress = action.payload;
      })
      .addCase(calculateDailyCurrentAddress.rejected, state => {
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
  setChallengePublicKey,
  clearCalculator,
  addToCalculator,
  backspaceCalculator,
  resetToChallenge,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  checkWinCondition,
  addOperationToGraph,
  addBatchOperationsToGraph,
  saveState,
  loadState,
} = dailyCalculatorSlice.actions;

export default dailyCalculatorSlice.reducer;
