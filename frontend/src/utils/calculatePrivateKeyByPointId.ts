import { calculatePrivateKey, type Operation } from './privateKeyCalculation';

/**
 * Calculate the actual private key for a given point based on operations and context
 */
export function calculatePrivateKeyByPointId(
  pointId: string,
  operations: Operation[],
  startingMode: 'generator' | 'challenge',
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | undefined {
  try {
    if (pointId === 'generator') {
      return 1n;
    } else if (pointId === 'current') {
      return (
        calculatePrivateKey(operations, startingMode, isPracticeMode, practicePrivateKey) ||
        undefined
      );
    } else if (pointId === 'previous' && operations.length > 1) {
      const opsWithoutLast = operations.slice(0, -1);
      return (
        calculatePrivateKey(opsWithoutLast, startingMode, isPracticeMode, practicePrivateKey) ||
        undefined
      );
    } else if (pointId === 'original' && isPracticeMode) {
      return practicePrivateKey ? BigInt('0x' + practicePrivateKey) : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
