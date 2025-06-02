import { getGeneratorPoint } from './ecc';
import { calculatePrivateKey, type Operation } from './privateKeyCalculation';
import type { ECPoint } from './ecc';

/**
 * Calculate the actual private key for a given point based on operations and context
 */
export function calculatePrivateKeyByPointId(
  pointId: string,
  operations: Operation[],
  currentPoint: ECPoint, // The current point for calculation
  isPracticeMode: boolean = false,
  practicePrivateKey?: string
): bigint | undefined {
  try {
    const generatorPoint = getGeneratorPoint();

    if (pointId === 'generator') {
      return 1n;
    } else if (pointId === 'current') {
      // Create known points array
      const knownPoints = [];

      // Add generator point
      knownPoints.push({
        point: generatorPoint,
        privateKey: 1n,
        label: 'Generator',
      });

      // Add challenge point if in practice mode
      if (isPracticeMode && practicePrivateKey) {
        // We need the challenge point - this would need to be passed in or derived
        // For now, we'll handle this case differently
        knownPoints.push({
          point: currentPoint, // This is a simplification
          privateKey: BigInt('0x' + practicePrivateKey),
          label: 'Challenge',
        });
      }

      return (
        calculatePrivateKey(
          operations,
          currentPoint,
          knownPoints,
          isPracticeMode,
          practicePrivateKey
        ) || undefined
      );
    } else if (pointId === 'previous' && operations.length > 1) {
      const opsWithoutLast = operations.slice(0, -1);
      const knownPoints = [];

      knownPoints.push({
        point: generatorPoint,
        privateKey: 1n,
        label: 'Generator',
      });

      if (isPracticeMode && practicePrivateKey) {
        knownPoints.push({
          point: currentPoint,
          privateKey: BigInt('0x' + practicePrivateKey),
          label: 'Challenge',
        });
      }

      return (
        calculatePrivateKey(
          opsWithoutLast,
          currentPoint,
          knownPoints,
          isPracticeMode,
          practicePrivateKey
        ) || undefined
      );
    } else if (pointId === 'original' && isPracticeMode) {
      return practicePrivateKey ? BigInt('0x' + practicePrivateKey) : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}
