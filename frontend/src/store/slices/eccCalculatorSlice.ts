import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { getP2PKHAddress } from '../../utils/crypto';
import {
  getGeneratorPoint,
  pointToPublicKey,
  publicKeyToPoint,
  pointMultiply,
  pointDivide,
  pointAdd,
  pointSubtract,
  hexToBigint,
  CURVE_N,
} from '../../utils/ecc';
import type {
  ECPoint,
  KnownPoint,
  Operation,
  SavedPoint,
  PointGraph,
  GraphNode,
} from '../../types/ecc';
import {
  createEmptyGraph,
  addNode,
  addEdge,
  findNodeByPoint,
  hasPath,
  calculateNodePrivateKey,
  pointToHash,
} from '../../utils/pointGraph';
import { updateAllPrivateKeys } from '../../utils/graphPrivateKeyCalculation';

interface ECCCalculatorState {
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

const initialState: ECCCalculatorState = {
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

export const executeCalculatorOperation = createAsyncThunk(
  'eccCalculator/executeCalculatorOperation',
  async (
    { operation, value }: { operation: 'multiply' | 'divide' | 'add' | 'subtract'; value: string },
    { getState, dispatch }
  ) => {
    const state = getState() as any;
    const { selectedPoint } = state.eccCalculator;

    try {
      let operationValue: bigint;
      if (value.startsWith('0x')) {
        operationValue = hexToBigint(value);
      } else {
        operationValue = BigInt(value);
      }

      if (operationValue <= 0n || operationValue >= CURVE_N) {
        throw new Error('Value must be between 1 and curve order');
      }

      let newPoint: ECPoint;
      let operationRecord: Operation;

      switch (operation) {
        case 'multiply':
          newPoint = pointMultiply(selectedPoint, operationValue);
          operationRecord = {
            id: `op_${Date.now()}`,
            type: 'multiply',
            value: operationValue.toString(),
            description: `× ${operationValue.toString()}`,
          };
          break;
        case 'divide':
          newPoint = pointDivide(selectedPoint, operationValue);
          operationRecord = {
            id: `op_${Date.now()}`,
            type: 'divide',
            value: operationValue.toString(),
            description: `÷ ${operationValue.toString()}`,
          };
          break;
        case 'add':
          const addPoint = publicKeyToPoint('02' + operationValue.toString(16).padStart(64, '0'));
          newPoint = pointAdd(selectedPoint, addPoint);
          operationRecord = {
            id: `op_${Date.now()}`,
            type: 'add',
            value: operationValue.toString(),
            description: `+ ${operationValue.toString()}`,
          };
          break;
        case 'subtract':
          const subPoint = publicKeyToPoint('02' + operationValue.toString(16).padStart(64, '0'));
          newPoint = pointSubtract(selectedPoint, subPoint);
          operationRecord = {
            id: `op_${Date.now()}`,
            type: 'subtract',
            value: operationValue.toString(),
            description: `- ${operationValue.toString()}`,
          };
          break;
        default:
          throw new Error('Invalid operation');
      }

      // Return data for reducer to handle graph updates
      return {
        point: newPoint,
        operation: operationRecord,
        value,
        fromPoint: selectedPoint,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Operation failed');
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
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
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
      state.savedPoints = [];
      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
      state.challengePublicKey = challengePublicKey;
    },
    resetToGenerator: state => {
      state.selectedPoint = generatorPoint;
      state.savedPoints = [];
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

      const savedPoint: SavedPoint = {
        id: `saved_${Date.now()}`,
        point: state.selectedPoint,
        label: label || `Point ${state.savedPoints.length + 1}`,
        timestamp: Date.now(),
      };

      state.savedPoints.push(savedPoint);
    },
    loadSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const savedPoint = action.payload;
      state.selectedPoint = savedPoint.point;

      // Add the saved point to the graph if it doesn't exist
      addNode(state.graph, savedPoint.point, {
        id: savedPoint.id,
        label: savedPoint.label,
      });

      state.error = null;
      state.calculatorDisplay = '';
      state.pendingOperation = null;
      state.hexMode = false;
      state.lastOperationValue = null;
      state.hasWon = false;
      state.showVictoryModal = false;
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
  },
  extraReducers: builder => {
    builder
      .addCase(calculateCurrentAddress.fulfilled, (state, action) => {
        state.currentAddress = action.payload;
      })
      .addCase(calculateCurrentAddress.rejected, state => {
        state.currentAddress = 'Invalid';
      })
      .addCase(executeCalculatorOperation.fulfilled, (state, action) => {
        const { point, operation, value, fromPoint } = action.payload;

        // Add new node for the resulting point (or get existing one)
        const toNode = addNode(state.graph, point, {
          label: `Point from ${operation.description}`,
        });

        // Find the from node in the graph and add edge
        const fromNode = findNodeByPoint(state.graph, fromPoint);
        if (fromNode) {
          addEdge(state.graph, fromNode.id, toNode.id, operation);
        }

        // Update all private keys in the graph
        updateAllPrivateKeys(state.graph);

        // Update current state
        state.selectedPoint = point;
        state.lastOperationValue = value;
        state.calculatorDisplay = '';
        state.pendingOperation = null;
        state.error = null;

        // Check win condition after each operation
        if (state.challengeNodeId && state.generatorNodeId) {
          const hasConnection = hasPath(state.graph, state.challengeNodeId, state.generatorNodeId);

          if (hasConnection && !state.hasWon) {
            state.hasWon = true;
            state.showVictoryModal = true;
          }
        }
      })
      .addCase(executeCalculatorOperation.rejected, (state, action) => {
        state.error = action.error.message || 'Operation failed';
      });
  },
});

export const {
  setSelectedPoint,
  setError,
  setHasWon,
  setShowVictoryModal,
  setCalculatorDisplay,
  setPendingOperation,
  setLastOperationValue,
  setHexMode,
  setSavedPoints,
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

// Define thunks that use slice actions after slice definition
export const setCalculatorOperationThunk = createAsyncThunk(
  'eccCalculator/setCalculatorOperationThunk',
  async (operation: 'multiply' | 'divide' | 'add' | 'subtract', { getState, dispatch }) => {
    const state = getState() as any;
    const { calculatorDisplay, pendingOperation, lastOperationValue } = state.eccCalculator;

    // If there's a value in the display and we haven't set a pending operation yet
    if (calculatorDisplay.trim() && !pendingOperation) {
      dispatch(setPendingOperation(operation));
    } else if (calculatorDisplay.trim() && pendingOperation) {
      // Execute the pending operation first
      await dispatch(
        executeCalculatorOperation({
          operation: pendingOperation,
          value: calculatorDisplay.trim(),
        })
      );
      dispatch(setPendingOperation(operation));
    } else if (lastOperationValue) {
      // Reuse last operation value
      await dispatch(
        executeCalculatorOperation({
          operation,
          value: lastOperationValue,
        })
      );
    } else {
      dispatch(setPendingOperation(operation));
    }
  }
);

export const executeEqualsOperation = createAsyncThunk(
  'eccCalculator/executeEqualsOperation',
  async (_, { getState, dispatch }) => {
    const state = getState() as any;
    const { pendingOperation, calculatorDisplay, lastOperationValue } = state.eccCalculator;

    if (pendingOperation && calculatorDisplay.trim()) {
      return dispatch(
        executeCalculatorOperation({
          operation: pendingOperation,
          value: calculatorDisplay.trim(),
        })
      );
    } else if (lastOperationValue && pendingOperation) {
      return dispatch(
        executeCalculatorOperation({
          operation: pendingOperation,
          value: lastOperationValue,
        })
      );
    }
  }
);

export default eccCalculatorSlice.reducer;
