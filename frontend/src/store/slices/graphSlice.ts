import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getGeneratorPoint } from '../../utils/ecc';
import { createEmptyGraph, addNode } from '../../utils/graphOperations';
import type { PointGraph, GraphNode, GraphEdge } from '../../types/ecc';

interface GraphState {
  nodes: Record<string, GraphNode>;
  edges: Record<string, GraphEdge>;
  pointToNodeId: Record<string, string>;
  generatorNodeId: string | null;
  dailyChallengeNodeId: string | null;
  practiceChallengeNodeId: string | null;
}

// Initialize graph with generator point
const initializeGraph = (): GraphState => {
  const graph = createEmptyGraph();
  const generatorPoint = getGeneratorPoint();
  const generatorNode = addNode(graph, generatorPoint, {
    id: 'generator',
    label: 'Generator (G)',
    privateKey: 1n,
    isGenerator: true,
  });

  return {
    nodes: graph.nodes,
    edges: graph.edges,
    pointToNodeId: graph.pointToNodeId,
    generatorNodeId: generatorNode.id,
    dailyChallengeNodeId: null,
    practiceChallengeNodeId: null,
  };
};

const initialState: GraphState = initializeGraph();

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    addGraphNode: (state, action: PayloadAction<{ node: GraphNode; pointHash: string }>) => {
      const { node, pointHash } = action.payload;
      state.nodes[node.id] = node;
      state.pointToNodeId[pointHash] = node.id;
    },

    addGraphEdge: (state, action: PayloadAction<GraphEdge>) => {
      const edge = action.payload;
      state.edges[edge.id] = edge;
    },

    updateGraphEdge: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<GraphEdge> }>
    ) => {
      const { id, updates } = action.payload;
      if (state.edges[id]) {
        state.edges[id] = { ...state.edges[id], ...updates };
      }
    },

    removeGraphNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      delete state.nodes[nodeId];

      // Remove from pointToNodeId mapping
      for (const [hash, id] of Object.entries(state.pointToNodeId)) {
        if (id === nodeId) {
          delete state.pointToNodeId[hash];
          break;
        }
      }

      // Remove connected edges
      for (const edgeId of Object.keys(state.edges)) {
        const edge = state.edges[edgeId];
        if (edge.fromNodeId === nodeId || edge.toNodeId === nodeId) {
          delete state.edges[edgeId];
        }
      }
    },

    removeGraphEdge: (state, action: PayloadAction<string>) => {
      delete state.edges[action.payload];
    },

    setDailyChallengeNode: (state, action: PayloadAction<string | null>) => {
      state.dailyChallengeNodeId = action.payload;
    },

    setPracticeChallengeNode: (state, action: PayloadAction<string | null>) => {
      state.practiceChallengeNodeId = action.payload;
    },

    updateNodePrivateKey: (
      state,
      action: PayloadAction<{ nodeId: string; privateKey: bigint }>
    ) => {
      const { nodeId, privateKey } = action.payload;
      if (state.nodes[nodeId]) {
        state.nodes[nodeId].privateKey = privateKey;
      }
    },

    resetGraph: () => initializeGraph(),

    // Batch operations for performance
    batchAddNodes: (
      state,
      action: PayloadAction<Array<{ node: GraphNode; pointHash: string }>>
    ) => {
      for (const { node, pointHash } of action.payload) {
        state.nodes[node.id] = node;
        state.pointToNodeId[pointHash] = node.id;
      }
    },

    batchAddEdges: (state, action: PayloadAction<GraphEdge[]>) => {
      for (const edge of action.payload) {
        state.edges[edge.id] = edge;
      }
    },
  },
});

export const {
  addGraphNode,
  addGraphEdge,
  updateGraphEdge,
  removeGraphNode,
  removeGraphEdge,
  setDailyChallengeNode,
  setPracticeChallengeNode,
  updateNodePrivateKey,
  resetGraph,
  batchAddNodes,
  batchAddEdges,
} = graphSlice.actions;

export default graphSlice.reducer;

// Selectors
export const selectGraph = (state: { graph: GraphState }): PointGraph => ({
  nodes: state.graph.nodes,
  edges: state.graph.edges,
  pointToNodeId: state.graph.pointToNodeId,
});

export const selectGeneratorNodeId = (state: { graph: GraphState }) => state.graph.generatorNodeId;
export const selectDailyChallengeNodeId = (state: { graph: GraphState }) =>
  state.graph.dailyChallengeNodeId;
export const selectPracticeChallengeNodeId = (state: { graph: GraphState }) =>
  state.graph.practiceChallengeNodeId;

export const selectNode = (state: { graph: GraphState }, nodeId: string) =>
  state.graph.nodes[nodeId];
export const selectEdge = (state: { graph: GraphState }, edgeId: string) =>
  state.graph.edges[edgeId];

export const selectNodeByPoint = (state: { graph: GraphState }, pointHash: string) => {
  const nodeId = state.graph.pointToNodeId[pointHash];
  return nodeId ? state.graph.nodes[nodeId] : undefined;
};
