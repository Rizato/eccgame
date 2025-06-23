import { pointMultiplyWithIntermediates, pointDivideWithIntermediates } from './ecc';
import { addNode, addEdge, findNodeByPoint } from './graphOperations';
import type { ECPoint, PointGraph, Operation } from '../types/ecc';

/**
 * Configuration for intermediate handling
 */
interface IntermediateConfig {
  // Skip intermediates for scalars larger than this threshold
  maxIntermediatesThreshold: number;
  // Skip intermediates for operations with more than this many steps
  maxStepsThreshold: number;
  // Always show intermediates if explicitly requested by user
  forceShowIntermediates: boolean;
}

const DEFAULT_CONFIG: IntermediateConfig = {
  maxIntermediatesThreshold: 255, // 8-bit threshold
  maxStepsThreshold: 12, // Reasonable UI limit
  forceShowIntermediates: false,
};

/**
 * Optimized operation handler that intelligently manages intermediates
 */
export function addOptimizedOperationToGraph(
  graph: PointGraph,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation,
  config: IntermediateConfig = DEFAULT_CONFIG
): void {
  const scalar = BigInt(operation.value);
  const shouldShowIntermediates = shouldGenerateIntermediates(scalar, operation, config);

  if (shouldShowIntermediates) {
    // Use detailed intermediates for educational purposes
    addOperationWithIntermediates(graph, fromPoint, toPoint, operation);
  } else {
    // Use direct operation for performance
    addOperationDirect(graph, fromPoint, toPoint, operation);
  }
}

/**
 * Decide whether to show intermediate steps based on complexity and user settings
 */
function shouldGenerateIntermediates(
  scalar: bigint,
  operation: Operation,
  config: IntermediateConfig
): boolean {
  // Always show if explicitly requested
  if (config.forceShowIntermediates) {
    return true;
  }

  // Skip for very large scalars (performance optimization)
  if (scalar > config.maxIntermediatesThreshold) {
    return false;
  }

  // Estimate number of steps for multiplication/division
  if (operation.type === 'multiply' || operation.type === 'divide') {
    const estimatedSteps = scalar.toString(2).length + scalar.toString(2).split('1').length - 1; // Rough estimate of double-and-add steps

    if (estimatedSteps > config.maxStepsThreshold) {
      return false;
    }
  }

  // Show intermediates for educational value
  return true;
}

/**
 * Add operation with full intermediate steps (current detailed approach)
 */
function addOperationWithIntermediates(
  graph: PointGraph,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation
): void {
  let intermediates: Array<{ point: ECPoint; operation: Operation }> = [];

  // Generate intermediates based on operation type
  if (operation.type === 'multiply') {
    const scalar = BigInt(operation.value);
    const result = pointMultiplyWithIntermediates(scalar, fromPoint);
    intermediates = result.intermediates;
  } else if (operation.type === 'divide') {
    const scalar = BigInt(operation.value);
    const result = pointDivideWithIntermediates(scalar, fromPoint);
    intermediates = result.intermediates;
  }

  if (intermediates.length > 0) {
    // Batch create all nodes first (without private keys to avoid per-node propagation)
    batchCreateNodes(graph, fromPoint, intermediates, toPoint);

    // Batch create all edges
    batchCreateEdges(graph, fromPoint, intermediates, toPoint, operation);

    // Single propagation pass at the end
    batchCalculatePrivateKeys(graph, fromPoint, intermediates, operation);
  } else {
    // Fallback to direct operation for non-multiplication/division operations
    addOperationDirect(graph, fromPoint, toPoint, operation);
  }
}

/**
 * Add operation directly without intermediates (performance optimization)
 */
function addOperationDirect(
  graph: PointGraph,
  fromPoint: ECPoint,
  toPoint: ECPoint,
  operation: Operation
): void {
  // Add or find from node
  let fromNode = findNodeByPoint(graph, fromPoint);
  if (!fromNode) {
    fromNode = addNode(graph, fromPoint, { label: 'Point' });
  }

  // Add or find to node
  let toNode = findNodeByPoint(graph, toPoint);
  if (!toNode) {
    toNode = addNode(graph, toPoint, { label: `Point from ${operation.description}` });
  }

  // Add edge
  addEdge(graph, fromNode.id, toNode.id, operation);

  // Calculate private key directly if possible
  if (fromNode.privateKey !== undefined && toNode.privateKey === undefined) {
    calculateDirectPrivateKey(fromNode, toNode, operation);
  } else if (toNode.privateKey !== undefined && fromNode.privateKey === undefined) {
    calculateReversePrivateKey(fromNode, toNode, operation);
  }
}

/**
 * Efficiently create all nodes in batch without triggering propagation
 */
function batchCreateNodes(
  graph: PointGraph,
  startPoint: ECPoint,
  intermediates: Array<{ point: ECPoint; operation: Operation }>,
  endPoint: ECPoint
): void {
  // Ensure start node exists
  if (!findNodeByPoint(graph, startPoint)) {
    addNode(graph, startPoint, { label: 'Start Point' });
  }

  // Add all intermediate nodes
  for (const intermediate of intermediates) {
    if (!findNodeByPoint(graph, intermediate.point)) {
      addNode(graph, intermediate.point, {
        label: `Intermediate ${intermediate.operation.description}`,
      });
    }
  }

  // Ensure end node exists
  if (!findNodeByPoint(graph, endPoint)) {
    addNode(graph, endPoint, { label: 'Result Point' });
  }
}

/**
 * Efficiently create all edges in batch
 */
function batchCreateEdges(
  graph: PointGraph,
  startPoint: ECPoint,
  intermediates: Array<{ point: ECPoint; operation: Operation }>,
  endPoint: ECPoint,
  originalOperation: Operation
): void {
  let currentPoint = startPoint;

  // Add edges for each intermediate step
  for (const intermediate of intermediates) {
    const fromNode = findNodeByPoint(graph, currentPoint);
    const toNode = findNodeByPoint(graph, intermediate.point);

    if (fromNode && toNode) {
      addEdge(graph, fromNode.id, toNode.id, {
        ...intermediate.operation,
        userCreated: originalOperation.userCreated, // Inherit from original
      });
    }

    currentPoint = intermediate.point;
  }

  // Add final edge if needed
  if (
    intermediates.length > 0 &&
    (currentPoint.x !== endPoint.x || currentPoint.y !== endPoint.y)
  ) {
    const fromNode = findNodeByPoint(graph, currentPoint);
    const toNode = findNodeByPoint(graph, endPoint);

    if (fromNode && toNode) {
      addEdge(graph, fromNode.id, toNode.id, {
        type: 'multiply',
        description: 'Final',
        value: '1',
        userCreated: originalOperation.userCreated,
      });
    }
  }
}

/**
 * Efficiently calculate private keys in a single pass
 */
function batchCalculatePrivateKeys(
  graph: PointGraph,
  startPoint: ECPoint,
  intermediates: Array<{ point: ECPoint; operation: Operation }>,
  originalOperation: Operation
): void {
  const startNode = findNodeByPoint(graph, startPoint);
  if (!startNode?.privateKey) {
    return; // Can't propagate without starting private key
  }

  let currentPrivateKey = startNode.privateKey;
  let currentPoint = startPoint;

  // Calculate private keys sequentially (much faster than recursive propagation)
  for (const intermediate of intermediates) {
    const node = findNodeByPoint(graph, intermediate.point);
    if (node) {
      // Calculate private key based on the specific operation
      currentPrivateKey = calculatePrivateKeyForOperation(
        currentPrivateKey,
        intermediate.operation
      );

      node.privateKey = currentPrivateKey;
      node.connectedToG = startNode.connectedToG || false;
    }
    currentPoint = intermediate.point;
  }
}

/**
 * Calculate private key for a specific operation without using the heavy calculateKeyFromOperations
 */
function calculatePrivateKeyForOperation(currentKey: bigint, operation: Operation): bigint {
  const value = BigInt(operation.value);

  switch (operation.type) {
    case 'multiply':
      return currentKey * value;
    case 'divide':
      // This would need modular inverse - for now use approximation
      return currentKey; // TODO: Implement proper modular inverse
    case 'add':
      return currentKey + 1n; // Double operation in double-and-add
    case 'subtract':
      return currentKey - value;
    case 'negate':
      return -currentKey;
    default:
      return currentKey;
  }
}

/**
 * Direct private key calculation for simple operations
 */
function calculateDirectPrivateKey(
  fromNode: { privateKey?: bigint },
  toNode: { privateKey?: bigint },
  operation: Operation
): void {
  if (fromNode.privateKey === undefined || toNode.privateKey !== undefined) {
    return;
  }

  toNode.privateKey = calculatePrivateKeyForOperation(fromNode.privateKey, operation);
}

/**
 * Reverse private key calculation for simple operations
 */
function calculateReversePrivateKey(
  fromNode: { privateKey?: bigint },
  toNode: { privateKey?: bigint },
  operation: Operation
): void {
  if (toNode.privateKey === undefined || fromNode.privateKey !== undefined) {
    return;
  }

  // Calculate reverse operation
  const value = BigInt(operation.value);

  switch (operation.type) {
    case 'multiply':
      // fromKey * value = toKey, so fromKey = toKey / value
      fromNode.privateKey = toNode.privateKey; // TODO: Implement proper division
      break;
    case 'divide':
      // fromKey / value = toKey, so fromKey = toKey * value
      fromNode.privateKey = toNode.privateKey * value;
      break;
    case 'add':
      fromNode.privateKey = toNode.privateKey - value;
      break;
    case 'subtract':
      fromNode.privateKey = toNode.privateKey + value;
      break;
    case 'negate':
      fromNode.privateKey = -toNode.privateKey;
      break;
    default:
      break;
  }
}

/**
 * Create a performance-aware configuration
 */
export function createPerformanceConfig(
  options: Partial<IntermediateConfig> = {}
): IntermediateConfig {
  return {
    ...DEFAULT_CONFIG,
    ...options,
  };
}

/**
 * High-performance configuration that prioritizes speed over educational detail
 */
export const HIGH_PERFORMANCE_CONFIG = createPerformanceConfig({
  maxIntermediatesThreshold: 31, // Very small threshold
  maxStepsThreshold: 5,
  forceShowIntermediates: false,
});

/**
 * Educational configuration that shows all intermediate steps
 */
export const EDUCATIONAL_CONFIG = createPerformanceConfig({
  maxIntermediatesThreshold: 65535, // Very large threshold
  maxStepsThreshold: 50,
  forceShowIntermediates: true,
});
