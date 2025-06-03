import { calculateKeyFromOperations, calculatePrivateKey } from './privateKeyCalculation';
import type { ECPoint, KnownPoint, Operation } from '../types/ecc.ts';
import type { Challenge } from '../types/api.ts';
import { pointToPublicKey, publicKeyToPoint } from './ecc.ts';

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
 * Helper function to check if two points are equal
 */
function pointsEqual(p1: ECPoint, p2: ECPoint): boolean {
  if (p1.isInfinity && p2.isInfinity) return true;
  if (p1.isInfinity || p2.isInfinity) return false;
  return p1.x === p2.x && p1.y === p2.y;
}

/**
 * Calculate the challenge point's private key by cascading backwards through saved points
 */
export function calculateChallengePrivateKey(
  challenge: Challenge,
  knownPoints: KnownPoint[]
): bigint | undefined {
  // TODO ITS A GRAPH PROBLEM!
  // ~TODO Ensure that all nested KnownPoint objects are present in the list~
  // Perhaps a smell that I should use a different structure
  const challengePoint = publicKeyToPoint(challenge.public_key);

  // If we already have the private key, great
  for (let known of knownPoints) {
    if (pointsEqual(challengePoint, known.point) && known.privateKey !== undefined) {
      return known.privateKey;
    }
  }
  // I essentially have a list of linked-lists, that may or may not be connected.
  // There should really be at most 2 lists. One reachable from G, and another from challenge

  /*
  TODO Make a test from this case
  [
    {point: G, staringPoint: null, privateKey: 1},
    {point: 5G, staringPoint: {G}},
    {point: 5G, staringPoint: {10G}},
    {point: 10G, staringPoint: {Challenge (18G)}},
    {point: Challenge, startingPoint: null}
  ]
  */

  const privateKeys = new Map<string, bigint>();
  // TODO Build a queue for faster ops
  const queue = new Array<KnownPoint>();

  // Find any knownPoints that have a private key (G will always be a part of this)
  // The subset of knownPoints with private keys determines how far we can reach out
  for (let point of knownPoints) {
    if (point.privateKey !== undefined) {
      privateKeys.set(pointToPublicKey(point.point), point.privateKey);
      queue.push(point);
    }
  }

  // If the known point is used anywhere as a startingPoint, calculate the key for the child point, and add to queue
  // If another known point points to the same point, do inversed and inverted logic to calculate it's other startingPoint key
  while (queue.length > 0) {
    // Get the next solved point
    const solvedPoint = queue.shift();
    if (solvedPoint === undefined) {
      // TODO Can this happen? Can I do the queue.shift call in the while expression?
      break;
    }
    if (pointsEqual(solvedPoint.point, challengePoint)) {
      return solvedPoint.privateKey;
    }
    // Load the private key from cache (We recreate the KnownPoint objects so much, it won't update others on write)
    const solvedPrivateKey = privateKeys.get(pointToPublicKey(solvedPoint.point));
    if (solvedPrivateKey === undefined) {
      // TODO This should not happen, maybe raise an exception?
      continue;
    }
    // Update all known points that are the same as the solvedPoint, and recursively solve the startingPoint keys
    for (let unsolved of knownPoints) {
      if (pointsEqual(unsolved.point, solvedPoint.point)) {
        unsolved.privateKey = solvedPrivateKey;
        const unsolvedStartingPoint = unsolved.startingPoint;
        if (unsolvedStartingPoint !== undefined && unsolvedStartingPoint.privateKey === undefined) {
          // Work backwards from now-solved point to it's starting point
          const reversedOps = reverseOperations(unsolved.operations);

          // If at infinity, add correction operation
          if (unsolved.point.isInfinity) {
            reversedOps.push({
              id: 'infinity-correction',
              type: 'subtract',
              description: '-1',
              value: '1',
            });
          }
          const privateKey = calculateKeyFromOperations(reversedOps, unsolved.privateKey);
          unsolvedStartingPoint.privateKey = privateKey;
          privateKeys.set(pointToPublicKey(unsolved.point), privateKey);
          queue.push(unsolvedStartingPoint);
        }
      }
    }

    // Update all known points that use the solvedPoint as a starting point
    for (let unsolved of knownPoints) {
      const unsolvedStartingPoint = unsolved.startingPoint;
      if (unsolvedStartingPoint === undefined) {
        continue;
      }
      // If the point started at this known point, calculate the private key
      if (pointsEqual(unsolvedStartingPoint.point, solvedPoint.point)) {
        // Overwrite the private key from cache in case the KnownPoint object is duplicated
        unsolvedStartingPoint.privateKey = solvedPrivateKey;
        const privateKey = calculatePrivateKey(unsolved);
        if (privateKey !== undefined) {
          privateKeys.set(pointToPublicKey(unsolved.point), privateKey);
          queue.push(unsolved);
        } else {
          // TODO This is a really big problem, and something didn't work out
        }
      }
    }
  }

  return undefined;
}
