import {
  calculateKeyFromOperations,
  type Operation,
  type SavedPoint,
} from './privateKeyCalculation';

/**
 * Reverse an operation type for key reconstruction
 */
function reverseOperationType(type: string): string {
  switch (type) {
    case 'add':
      return 'subtract';
    case 'subtract':
      return 'add';
    case 'multiply':
      return 'divide';
    case 'divide':
      return 'multiply';
    case 'negate':
      return 'negate'; // Negate is its own inverse
    default:
      return 'nop';
  }
}

/**
 * Reverse a list of operations for key reconstruction
 */
function reverseOperations(operations: Operation[]): Operation[] {
  const reversed = [];
  for (const op of operations) {
    reversed.push({
      id: op.id + '_reversed',
      type: reverseOperationType(op.type),
      description: `reverse(${op.description})`,
      value: op.value,
      point: op.point,
    });
  }
  // @ts-ignore
  return reversed.reverse();
}

/**
 * Calculate the challenge point's private key by cascading backwards through saved points
 */
export function calculateChallengePrivateKey(
  operations: Operation[],
  currentSavedPoint: SavedPoint | null,
  startingMode: 'generator' | 'challenge',
  isAtInfinity: boolean = false,
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint {
  // If we started from generator or we know the starting private key, use normal calculation
  if (startingMode === 'generator') {
    return calculateKeyFromOperations(operations, 1n);
  }

  if (currentSavedPoint && currentSavedPoint.privateKey !== undefined) {
    return calculateKeyFromOperations(operations, currentSavedPoint.privateKey);
  }

  if (isPracticeMode && practicePrivateKey) {
    return calculateKeyFromOperations(operations, BigInt('0x' + practicePrivateKey));
  }

  // We started from challenge with unknown private key and reached a known point (G or infinity)
  // Use reverse reconstruction to find the challenge private key

  // Build the complete operation chain from challenge to victory point
  let allOperations = operations;

  // If we're building from a saved point, include its operations
  if (currentSavedPoint) {
    // Check if this saved point has operations that should be included
    // The saved point represents a chain from some starting point to the saved point
    // Our current operations take us from the saved point to victory
    // So the complete chain is: savedPoint.operations + current operations
    allOperations = [...currentSavedPoint.operations, ...operations];
  }

  // Apply reverse reconstruction
  const reversedOps = reverseOperations(allOperations);

  // If at infinity, add correction operation
  if (isAtInfinity) {
    reversedOps.push({
      id: 'infinity-correction',
      type: 'subtract',
      description: '-1',
      value: '1',
    });
  }

  // Calculate from generator point (1) back to challenge
  // This gives us the challenge point's private key
  return calculateKeyFromOperations(reversedOps, 1n);
}

/**
 * Calculates the private key when victorious. It can always be calculated in this case
 * Enhanced to handle saved points and cascade reconstruction
 */
export function calculateVictoryPrivateKey(
  operations: Operation[],
  startingMode: 'generator' | 'challenge',
  isAtInfinity: boolean = false,
  currentSavedPoint: SavedPoint | null = null,
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint {
  return calculateChallengePrivateKey(
    operations,
    currentSavedPoint,
    startingMode,
    isAtInfinity,
    isPracticeMode,
    practicePrivateKey
  );
}
