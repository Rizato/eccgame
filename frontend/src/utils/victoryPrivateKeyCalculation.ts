import { calculateKeyFromOperations, type Operation } from './privateKeyCalculation';

/**
 * Calculates the private key when victorious. It can always be calculated in this case
 */
export function calculateVictoryPrivateKey(
  operations: Operation[],
  startingMode: 'generator' | 'challenge',
  isAtInfinity: boolean = false
): bigint {
  if (startingMode === 'generator') {
    // Generator mode: start from 1 and apply operations in order
    return calculateKeyFromOperations(operations, 1n);
  } else {
    // Challenge mode: start from 1 and apply reversed and negated operations
    const opsToReverse = [];
    for (const op of operations) {
      const negateType = (s: string) => {
        switch (s) {
          case 'add':
            return 'subtract';
          case 'subtract':
            return 'add';
          case 'multiply':
            return 'divide';
          case 'divide':
            return 'multiply';
          default:
            return 'nop';
        }
      };
      opsToReverse.push({
        id: op.id,
        type: negateType(op.type),
        description: op.description,
        value: op.value,
      });
    }

    // If at infinity in challenge mode, add +1 operation before reversing
    if (isAtInfinity) {
      opsToReverse.push({
        id: 'infinity-correction',
        type: 'subtract',
        description: '-1',
        value: '1',
      });
    }

    return calculateKeyFromOperations(opsToReverse.reverse(), 1n);
  }
}
