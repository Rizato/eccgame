/**
 * DAILY GAME SOLUTION SUBMISSION MODULE
 *
 * This module handles submitting challenge solutions
 * to the backend for the daily game only.
 */
import { challengeApi } from '../services/api';
import { generateSolutionFromPrivateKey } from './crypto';
import { calculatePrivateKeyFromGraph } from './pointPrivateKey';
import type { SolutionResponse } from '../types/api';
import type { PointGraph } from '../types/ecc';

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

    console.log('Submitted challenge solution:', {
      public_key: solution.public_key,
      result: response.result,
    });

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
  console.log('Submitting solution to backend...');

  // Then submit the challenge solution
  const challengeResult = await submitChallengePointAsSolution(
    challengeUuid,
    graph,
    challengeNodeId
  );

  console.log(`Submitted challenge solution`);

  return {
    challengeResult,
  };
}
