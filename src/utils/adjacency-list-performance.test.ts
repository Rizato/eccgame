import { describe, it, expect } from 'vitest';
import { createEmptyGraph, addNode, addEdge, getAllConnectedEdges } from './graphOperations';
import { getGeneratorPoint, pointMultiply } from './ecc';
import { OperationType } from '../types/ecc';

describe('Adjacency List Performance', () => {
  it('should correctly create bidirectional edges', () => {
    const graph = createEmptyGraph();
    const G = getGeneratorPoint();
    const point2G = pointMultiply(2n, G);

    // Add nodes
    const nodeG = addNode(graph, G, { label: 'G', isGenerator: true });
    const node2G = addNode(graph, point2G, { label: '2G' });

    // Add edge (should create both forward and reverse)
    const operation = {
      type: OperationType.MULTIPLY,
      description: '×2',
      value: '2',
      userCreated: true,
    };

    addEdge(graph, nodeG.id, node2G.id, operation);

    // Check forward edge
    expect(graph.edges[nodeG.id]).toBeDefined();
    expect(graph.edges[nodeG.id].length).toBe(1);
    expect(graph.edges[nodeG.id][0].fromNodeId).toBe(nodeG.id);
    expect(graph.edges[nodeG.id][0].toNodeId).toBe(node2G.id);
    expect(graph.edges[nodeG.id][0].operation.type).toBe(OperationType.MULTIPLY);

    // Check reverse edge
    expect(graph.edges[node2G.id]).toBeDefined();
    expect(graph.edges[node2G.id].length).toBe(1);
    expect(graph.edges[node2G.id][0].fromNodeId).toBe(node2G.id);
    expect(graph.edges[node2G.id][0].toNodeId).toBe(nodeG.id);
    expect(graph.edges[node2G.id][0].operation.type).toBe(OperationType.DIVIDE);
  });

  it('should efficiently get all connected edges', () => {
    const graph = createEmptyGraph();
    const G = getGeneratorPoint();

    // Create a star pattern: G connected to 2G, 3G, 4G, 5G
    const nodes = [G];
    for (let i = 2; i <= 5; i++) {
      nodes.push(pointMultiply(BigInt(i), G));
    }

    const graphNodes = nodes.map((point, i) =>
      addNode(graph, point, { label: i === 0 ? 'G' : `${i + 1}G` })
    );

    // Connect G to all other nodes
    for (let i = 1; i < graphNodes.length; i++) {
      addEdge(graph, graphNodes[0].id, graphNodes[i].id, {
        type: OperationType.MULTIPLY,
        description: `×${i + 1}`,
        value: `${i + 1}`,
        userCreated: true,
      });
    }

    // G should have 4 outgoing edges
    const gConnections = getAllConnectedEdges(graph, graphNodes[0].id);
    expect(gConnections.length).toBe(4);
    expect(gConnections.filter(c => c.direction === 'outgoing').length).toBe(4);

    // 2G should have 1 edge (reverse edge to G)
    const twoGConnections = getAllConnectedEdges(graph, graphNodes[1].id);
    expect(twoGConnections.length).toBe(1);
    // Since we store bidirectional edges, this is an outgoing edge from 2G to G
    expect(twoGConnections[0].direction).toBe('outgoing');
    expect(twoGConnections[0].edge.fromNodeId).toBe(graphNodes[1].id);
    expect(twoGConnections[0].edge.toNodeId).toBe(graphNodes[0].id);
    // The operation should be the inverse (divide)
    expect(twoGConnections[0].edge.operation.type).toBe(OperationType.DIVIDE);
  });

  it('should handle duplicate edge attempts', () => {
    const graph = createEmptyGraph();
    const G = getGeneratorPoint();
    const point2G = pointMultiply(2n, G);

    const nodeG = addNode(graph, G, { label: 'G' });
    const node2G = addNode(graph, point2G, { label: '2G' });

    const operation1 = {
      type: OperationType.MULTIPLY,
      description: '×2',
      value: '2',
      userCreated: false,
    };

    const operation2 = {
      type: OperationType.MULTIPLY,
      description: '×2',
      value: '2',
      userCreated: true, // Different userCreated flag
    };

    // Add edge twice with different userCreated flags
    addEdge(graph, nodeG.id, node2G.id, operation1);
    addEdge(graph, nodeG.id, node2G.id, operation2);

    // Should still only have 1 edge each direction
    expect(graph.edges[nodeG.id].length).toBe(1);
    expect(graph.edges[node2G.id].length).toBe(1);

    // userCreated should be sticky (true)
    expect(graph.edges[nodeG.id][0].operation.userCreated).toBe(true);
  });
});
