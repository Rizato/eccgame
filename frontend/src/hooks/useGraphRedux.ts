import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
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
  selectGraph,
  selectGeneratorNodeId,
  selectDailyChallengeNodeId,
  selectPracticeChallengeNodeId,
  selectNode,
  selectEdge,
  selectNodeByPoint,
} from '../store/slices/graphSlice';
import type { GraphNode, GraphEdge } from '../types/ecc';

export const useGraphRedux = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const graph = useAppSelector(selectGraph);
  const generatorNodeId = useAppSelector(selectGeneratorNodeId);
  const dailyChallengeNodeId = useAppSelector(selectDailyChallengeNodeId);
  const practiceChallengeNodeId = useAppSelector(selectPracticeChallengeNodeId);

  // Actions
  const addNode = (node: GraphNode, pointHash: string) => {
    dispatch(addGraphNode({ node, pointHash }));
  };

  const addEdge = (edge: GraphEdge) => {
    dispatch(addGraphEdge(edge));
  };

  const updateEdge = (id: string, updates: Partial<GraphEdge>) => {
    dispatch(updateGraphEdge({ id, updates }));
  };

  const removeNode = (nodeId: string) => {
    dispatch(removeGraphNode(nodeId));
  };

  const removeEdge = (edgeId: string) => {
    dispatch(removeGraphEdge(edgeId));
  };

  const setDailyChallenge = (nodeId: string | null) => {
    dispatch(setDailyChallengeNode(nodeId));
  };

  const setPracticeChallenge = (nodeId: string | null) => {
    dispatch(setPracticeChallengeNode(nodeId));
  };

  const updatePrivateKey = (nodeId: string, privateKey: bigint) => {
    dispatch(updateNodePrivateKey({ nodeId, privateKey }));
  };

  const reset = () => {
    dispatch(resetGraph());
  };

  const batchAddNodesAction = (nodes: Array<{ node: GraphNode; pointHash: string }>) => {
    dispatch(batchAddNodes(nodes));
  };

  const batchAddEdgesAction = (edges: GraphEdge[]) => {
    dispatch(batchAddEdges(edges));
  };

  // Helper selectors that take parameters
  const getNode = (nodeId: string) => useAppSelector(state => selectNode(state, nodeId));
  const getEdge = (edgeId: string) => useAppSelector(state => selectEdge(state, edgeId));
  const getNodeByPoint = (pointHash: string) =>
    useAppSelector(state => selectNodeByPoint(state, pointHash));

  return {
    // State
    graph,
    generatorNodeId,
    dailyChallengeNodeId,
    practiceChallengeNodeId,

    // Actions
    addNode,
    addEdge,
    updateEdge,
    removeNode,
    removeEdge,
    setDailyChallenge,
    setPracticeChallenge,
    updatePrivateKey,
    reset,
    batchAddNodes: batchAddNodesAction,
    batchAddEdges: batchAddEdgesAction,

    // Helper selectors
    getNode,
    getEdge,
    getNodeByPoint,
  };
};
