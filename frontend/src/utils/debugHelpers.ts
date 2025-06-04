import type { PointGraph, SavedPoint, GraphNode, GraphEdge } from '../types/ecc';

/**
 * Custom BigInt serializer for console logging
 */
function bigintReplacer(_key: string, value: any): any {
  if (typeof value === 'bigint') {
    return `0x${value.toString(16)}`;
  }
  return value;
}

/**
 * Log graph state with readable BigInt formatting
 */
export function logGraph(graph: PointGraph, label = 'Graph State'): void {
  console.group(`🔍 ${label}`);

  console.log('📊 Nodes:', Object.keys(graph.nodes).length);
  for (const [nodeId, node] of Object.entries(graph.nodes)) {
    console.log(`  🔵 ${nodeId}:`, {
      label: node.label,
      point: {
        x: node.point.isInfinity ? 'infinity' : `0x${node.point.x.toString(16)}`,
        y: node.point.isInfinity ? 'infinity' : `0x${node.point.y.toString(16)}`,
        isInfinity: node.point.isInfinity,
      },
      privateKey: node.privateKey ? `0x${node.privateKey.toString(16)}` : 'unknown',
      isGenerator: node.isGenerator,
      isChallenge: node.isChallenge,
    });
  }

  console.log('🔗 Edges:', Object.keys(graph.edges).length);
  for (const [edgeId, edge] of Object.entries(graph.edges)) {
    console.log(`  ➡️ ${edgeId}:`, {
      from: graph.nodes[edge.fromNodeId]?.label || edge.fromNodeId,
      to: graph.nodes[edge.toNodeId]?.label || edge.toNodeId,
      operation: edge.operation.description,
      isBundled: edge.isBundled,
      bundleCount: edge.bundleCount?.toString(),
    });
  }

  console.groupEnd();
}

/**
 * Log saved points with their private keys
 */
export function logSavedPoints(savedPoints: SavedPoint[], label = 'Saved Points'): void {
  console.group(`💾 ${label}`);

  savedPoints.forEach((sp, index) => {
    console.log(`  ${index + 1}. ${sp.label}:`, {
      point: {
        x: sp.point.isInfinity ? 'infinity' : `0x${sp.point.x.toString(16)}`,
        y: sp.point.isInfinity ? 'infinity' : `0x${sp.point.y.toString(16)}`,
        isInfinity: sp.point.isInfinity,
      },
      privateKey: sp.privateKey ? `0x${sp.privateKey.toString(16)}` : 'unknown',
      timestamp: new Date(sp.timestamp).toLocaleTimeString(),
    });
  });

  console.groupEnd();
}

/**
 * Log a specific node with all its connections
 */
export function logNodeConnections(graph: PointGraph, nodeId: string, label?: string): void {
  const node = graph.nodes[nodeId];
  if (!node) {
    console.warn(`❌ Node ${nodeId} not found`);
    return;
  }

  const nodeLabel = label || node.label || nodeId;
  console.group(`🔍 ${nodeLabel} Connections`);

  console.log('📍 Node:', {
    id: nodeId,
    label: node.label,
    point: {
      x: node.point.isInfinity ? 'infinity' : `0x${node.point.x.toString(16)}`,
      y: node.point.isInfinity ? 'infinity' : `0x${node.point.y.toString(16)}`,
      isInfinity: node.point.isInfinity,
    },
    privateKey: node.privateKey ? `0x${node.privateKey.toString(16)}` : 'unknown',
    isGenerator: node.isGenerator,
    isChallenge: node.isChallenge,
  });

  // Incoming edges
  const incomingEdges = Object.values(graph.edges).filter(e => e.toNodeId === nodeId);
  console.log('⬅️ Incoming edges:', incomingEdges.length);
  incomingEdges.forEach(edge => {
    const fromNode = graph.nodes[edge.fromNodeId];
    console.log(
      `    ${fromNode?.label || edge.fromNodeId} --[${edge.operation.description}]--> ${nodeLabel}`
    );
  });

  // Outgoing edges
  const outgoingEdges = Object.values(graph.edges).filter(e => e.fromNodeId === nodeId);
  console.log('➡️ Outgoing edges:', outgoingEdges.length);
  outgoingEdges.forEach(edge => {
    const toNode = graph.nodes[edge.toNodeId];
    console.log(
      `    ${nodeLabel} --[${edge.operation.description}]--> ${toNode?.label || edge.toNodeId}`
    );
  });

  console.groupEnd();
}

/**
 * Compare two saved points to check for false positives
 */
export function logSavedPointComparison(sp1: SavedPoint, sp2: SavedPoint): void {
  console.group(`🔍 Comparing: ${sp1.label} vs ${sp2.label}`);

  console.log('Point 1:', {
    point: {
      x: sp1.point.isInfinity ? 'infinity' : `0x${sp1.point.x.toString(16)}`,
      y: sp1.point.isInfinity ? 'infinity' : `0x${sp1.point.y.toString(16)}`,
      isInfinity: sp1.point.isInfinity,
    },
    privateKey: sp1.privateKey ? `0x${sp1.privateKey.toString(16)}` : 'unknown',
  });

  console.log('Point 2:', {
    point: {
      x: sp2.point.isInfinity ? 'infinity' : `0x${sp2.point.x.toString(16)}`,
      y: sp2.point.isInfinity ? 'infinity' : `0x${sp2.point.y.toString(16)}`,
      isInfinity: sp2.point.isInfinity,
    },
    privateKey: sp2.privateKey ? `0x${sp2.privateKey.toString(16)}` : 'unknown',
  });

  // Check if points are the same
  const samePoint =
    sp1.point.x === sp2.point.x &&
    sp1.point.y === sp2.point.y &&
    sp1.point.isInfinity === sp2.point.isInfinity;

  console.log('Same point?', samePoint);

  // Check if private keys match
  const samePrivateKey = sp1.privateKey === sp2.privateKey;
  console.log('Same private key?', samePrivateKey);

  if (samePoint && !samePrivateKey) {
    console.warn('🚨 FALSE POSITIVE: Same point but different private keys!');
  }

  console.groupEnd();
}

/**
 * Enable debug mode to automatically log graph changes
 */
export function enableGraphDebugging(): void {
  console.log('🐛 Graph debugging enabled');
  // You can add more automatic debugging hooks here
}
