/**
 * DAILY GAME GUESS SUBMISSION MODULE
 *
 * This module handles submitting challenge solutions
 * as guess to the backend for the daily game only.
 */
import { challengeApi } from '../services/api';
import { generateGuessFromPrivateKey } from './crypto';
import { calculatePrivateKeyFromGraph } from './pointPrivateKey';
import type { GuessResponse } from '../types/api';
import type { PointGraph } from '../types/ecc';

/**
 * Submit the challenge point as a guess when the challenge is solved
 * Only for daily game when a solution is found
 */
export async function submitChallengePointAsGuess(
  challengeUuid: string,
  graph: PointGraph,
  challengeNodeId: string
): Promise<GuessResponse | null> {
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

    // Generate guess from private key
    const guess = await generateGuessFromPrivateKey(privateKeyHex, challengeUuid);

    // Submit to backend
    const response = await challengeApi.submitGuess(challengeUuid, guess);

    console.log('Submitted challenge solution as guess:', {
      public_key: guess.public_key,
      result: response.result,
    });

    return response;
  } catch (error) {
    console.error('Failed to submit challenge solution as guess:', error);
    return null;
  }
}

/**
 * Submit both saved points and challenge point for daily game completion
 * This should be called when the daily challenge is solved
 */
export async function submitGuess(
  graph: PointGraph,
  challengeUuid: string,
  challengeNodeId: string
): Promise<{
  challengeResult: GuessResponse | null;
}> {
  console.log('Submitting all daily game guess to backend...');

  // Then submit the challenge solution
  const challengeResult = await submitChallengePointAsGuess(challengeUuid, graph, challengeNodeId);

  console.log(`Submitted challenge solution`);

  return {
    challengeResult,
  };
}
