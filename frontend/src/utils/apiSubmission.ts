/**
 * API SUBMISSION MODULE
 *
 * This module handles submitting saves and solutions to the backend
 * for the daily game.
 */
import { challengeApi } from '../services/api';
import { pointToPublicKey } from './ecc';
import { generateSolutionFromPrivateKey } from './crypto';
import { calculatePrivateKeyFromGraph } from './graphOperations';
import type { SaveResponse, SolutionResponse } from '../types/api';
import type { ECPoint, PointGraph } from '../types/ecc';

// Track submitted saves to avoid re-submission
// Key format: `{challengeUuid}::{publicKey}`
const submittedSaves = new Set<string>();

/**
 * Create a unique key for tracking submitted saves
 */
function createSaveKey(challengeUuid: string, publicKey: string): string {
  return `${challengeUuid}::${publicKey}`;
}

/**
 * Check if a save has already been submitted
 */
export function hasSubmittedSave(challengeUuid: string, point: ECPoint): boolean {
  if (point.isInfinity) {
    return false; // Don't track infinity points
  }

  const publicKey = pointToPublicKey(point);
  const saveKey = createSaveKey(challengeUuid, publicKey);
  return submittedSaves.has(saveKey);
}

/**
 * Submit a save to the backend if not already submitted
 * Returns SaveResponse if submitted, null if already submitted or failed
 */
export async function submitSaveToBackend(
  challengeUuid: string,
  point: ECPoint,
  label: string
): Promise<SaveResponse | null> {
  if (point.isInfinity) {
    return null;
  }

  const publicKey = pointToPublicKey(point);
  const saveKey = createSaveKey(challengeUuid, publicKey);

  // Check if already submitted
  if (submittedSaves.has(saveKey)) {
    return null;
  }

  try {
    const saveRequest = {
      public_key: publicKey,
    };

    const response = await challengeApi.submitSave(challengeUuid, saveRequest);

    // Mark as submitted to prevent re-submission
    submittedSaves.add(saveKey);

    return response;
  } catch (error) {
    console.error(`❌ Failed to submit save ${label}:`, error);
    return null;
  }
}

/**
 * Clear all submitted save tracking (useful for new challenges)
 */
export function clearSubmittedSaves(): void {
  submittedSaves.clear();
}

/**
 * Get the number of submitted saves for debugging
 */
export function getSubmittedSaveCount(): number {
  return submittedSaves.size;
}

/**
 * Check if this is a daily mode challenge and submit if appropriate
 */
export async function submitSaveIfDaily(
  challengeUuid: string | undefined,
  gameMode: string,
  point: ECPoint,
  label: string
): Promise<SaveResponse | null> {
  // Only submit for daily mode
  if (gameMode !== 'daily') {
    return null;
  }

  // Must have a challenge UUID
  if (!challengeUuid) {
    console.warn('Cannot submit save - no challenge UUID available');
    return null;
  }

  return submitSaveToBackend(challengeUuid, point, label);
}

/**
 * Submit the challenge point as a solution when the challenge is solved
 * Only for daily game when a solution is found
 */
export async function submitChallengePointAsSolution(
  challengeUuid: string,
  graph: PointGraph,
  challengeNodeId: string
): Promise<SolutionResponse | null> {
  try {
    // Find the challenge node in the graph
    const challengeNode = graph.nodes[challengeNodeId];
    if (!challengeNode) {
      console.error('Challenge node not found in graph');
      return null;
    }

    // Calculate the private key for the challenge point
    const privateKey = calculatePrivateKeyFromGraph(challengeNode.point, graph);

    if (!privateKey) {
      console.error('Could not calculate private key for challenge point');
      return null;
    }

    const privateKeyHex = '0x' + privateKey.toString(16).padStart(64, '0');

    // Generate solution from private key
    const solution = await generateSolutionFromPrivateKey(privateKeyHex, challengeUuid);

    // Submit to backend
    const response = await challengeApi.submitSolution(challengeUuid, solution);

    return response;
  } catch (error) {
    console.error('Failed to submit challenge solution:', error);
    return null;
  }
}

/**
 * Submit both saved points and challenge point for daily game completion
 * This should be called when the daily challenge is solved
 */
export async function submitSolution(
  graph: PointGraph,
  challengeUuid: string,
  challengeNodeId: string
): Promise<{
  challengeResult: SolutionResponse | null;
}> {
  // Then submit the challenge solution
  const challengeResult = await submitChallengePointAsSolution(
    challengeUuid,
    graph,
    challengeNodeId
  );

  return {
    challengeResult,
  };
}
