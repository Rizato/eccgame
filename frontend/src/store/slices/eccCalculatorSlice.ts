import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import { getGeneratorPoint, pointToPublicKey, publicKeyToPoint } from '../../utils/ecc';
import { ensureOperationInGraph } from '../../utils/graphOperations';
import { addBundledEdgeForNewSave, cleanupDanglingNodes } from '../../utils/operationBundling';
import {
  createEmptyGraph,
  addNode,
  hasPath,
  calculateNodePrivateKey,
} from '../../utils/graphOperations';
import { submitSolution, submitSaveIfDaily } from '../../utils/apiSubmission';
import { storageUtils } from '../../utils/storage';
import type { ECPoint, Operation, SavedPoint, PointGraph } from '../../types/ecc';

interface DailyCalculatorState {
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
  shouldSubmitSolution: boolean;
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

const initialState: DailyCalculatorState = {
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

export const submitDailySolution = createAsyncThunk(
  'dailyCalculator/submitDailyGameSolution',
  async (_arg: void, { getState }) => {
    const state = getState() as {
      dailyCalculator: DailyCalculatorState;
      game: { challenge: { uuid: string } | null };
    };

    const { graph, challengeNodeId } = state.dailyCalculator;
    const challengeUuid = state.game.challenge?.uuid;

    if (!challengeUuid || !challengeNodeId) {
      console.warn('Cannot submit solution - missing challenge UUID or node ID');
      return null;
    }

    try {
      const results = await submitSolution(graph, challengeUuid, challengeNodeId);
      return results;
    } catch (error) {
      console.error('Failed to submit daily game solution:', error);
      // Don't reject - we don't want to prevent the victory modal from showing
      return null;
    }
  }
);

export const submitSaveToBackend = createAsyncThunk(
  'dailyCalculator/submitSaveToBackend',
  async ({ point, label }: { point: ECPoint; label: string }, { getState }) => {
    const state = getState() as {
      dailyCalculator: DailyCalculatorState;
      game: { challenge: { uuid: string } | null; gameMode: string };
    };

    const challengeUuid = state.game.challenge?.uuid;
    const gameMode = state.game.gameMode;

    if (!challengeUuid) {
      console.warn('Cannot submit save - no challenge UUID');
      return null;
    }

    try {
      const result = await submitSaveIfDaily(challengeUuid, gameMode, point, label);
      return result;
    } catch (error) {
      console.error('Failed to submit save to backend:', error);
      return null;
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
      state.selectedPoint = challengePoint;

      // Add challenge node to graph
      const challengeNode = addNode(state.graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge Point',
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;
    },
    setChallengeWithPrivateKey: (
      state,
      action: PayloadAction<{ publicKey: string; privateKey: string }>
    ) => {
      const { publicKey, privateKey } = action.payload;
      state.challengePublicKey = publicKey;
      const challengePoint = publicKeyToPoint(publicKey);
      state.selectedPoint = challengePoint;

      // Add challenge node to graph with known private key
      const challengeNode = addNode(state.graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge Point',
        privateKey: BigInt('0x' + privateKey),
        isChallenge: true,
      });
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
    resetToChallenge: (state, action: PayloadAction<string>) => {
      const challengePublicKey = action.payload;
      const challengePoint = publicKeyToPoint(challengePublicKey);
      state.selectedPoint = challengePoint;

      // Ensure challenge node exists in graph (don't clear the graph, just ensure the node exists)
      const challengeNode = addNode(state.graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge Point',
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;

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

      // Ensure challenge node exists in graph with known private key
      const challengeNode = addNode(state.graph, challengePoint, {
        id: 'challenge',
        label: 'Challenge Point',
        privateKey: BigInt('0x' + privateKey),
        isChallenge: true,
      });
      state.challengeNodeId = challengeNode.id;

      // Don't clear saved points when switching to challenge
      cleanupDanglingNodes(state.graph, state.savedPoints);
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

      // Ensure generator node exists in graph (don't clear the graph, just ensure the node exists)
      const generatorNode = addNode(state.graph, generatorPoint, {
        id: 'generator',
        label: 'Generator (G)',
        privateKey: 1n,
        isGenerator: true,
      });
      state.generatorNodeId = generatorNode.id;

      // Don't clear saved points when switching to generator
      cleanupDanglingNodes(state.graph, state.savedPoints);
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

      // Find the current point's private key from the graph
      const currentNode = Object.values(state.graph.nodes).find(
        node =>
          node.point.x === state.selectedPoint.x &&
          node.point.y === state.selectedPoint.y &&
          node.point.isInfinity === state.selectedPoint.isInfinity
      );

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        label: label || `Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
        privateKey: currentNode?.privateKey,
      };

      state.savedPoints.push(savedPoint);

      // Create bundled edge for the saved point path (only if currentNode exists)
      if (currentNode) {
        addBundledEdgeForNewSave(state.graph, currentNode.id, state.savedPoints);
        cleanupDanglingNodes(state.graph, state.savedPoints);
      }
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const savedPoint = action.payload;
      state.selectedPoint = savedPoint.point;

      // Add the saved point to the graph if it doesn't exist, including its private key
      const node = addNode(state.graph, savedPoint.point, {
        id: savedPoint.id,
        label: savedPoint.label,
        privateKey: savedPoint.privateKey,
      });

      // If the saved point doesn't have a private key, try to calculate it from the graph
      if (!node.privateKey) {
        const calculatedKey = calculateNodePrivateKey(state.graph, node.id);
        if (calculatedKey) {
          node.privateKey = calculatedKey;
        }
      }

      // Clean up dangling nodes and edges when loading a point
      cleanupDanglingNodes(state.graph, state.savedPoints);

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
    checkWinCondition: (state, action: PayloadAction<string | undefined>) => {
      // Win condition: there's a path from challenge to generator in the graph
      if (state.challengeNodeId && state.generatorNodeId) {
        const hasConnection = hasPath(state.graph, state.challengeNodeId, state.generatorNodeId);
        if (hasConnection && !state.hasWon) {
          state.hasWon = true;
          state.showVictoryModal = true;
          state.shouldSubmitSolution = true; // Trigger solution submission

          // Mark address as won if provided
          const challengeAddress = action.payload;
          if (challengeAddress) {
            storageUtils.markWonByAddress(challengeAddress);
          }
        }
      }
    },
    clearShouldSubmitSolution: state => {
      state.shouldSubmitSolution = false;
    },
    initializeWinStateByAddress: (state, action: PayloadAction<string>) => {
      const address = action.payload;
      const hasWonBefore = storageUtils.hasWonByAddress(address);
      state.hasWon = hasWonBefore;
      // Don't show victory modal on initialization, only when actually winning
      state.showVictoryModal = false;
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
  setChallengeWithPrivateKey,
  clearCalculator,
  addToCalculator,
  backspaceCalculator,
  resetToChallenge,
  resetToChallengeWithPrivateKey,
  resetToGenerator,
  savePoint,
  loadSavedPoint,
  unsaveSavedPoint,
  checkWinCondition,
  clearShouldSubmitSolution,
  initializeWinStateByAddress,
  addOperationToGraph,
} = dailyCalculatorSlice.actions;

export default dailyCalculatorSlice.reducer;
