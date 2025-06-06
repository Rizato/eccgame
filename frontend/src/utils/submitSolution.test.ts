import { describe, expect, it, vi } from 'vitest';
import { getGeneratorPoint } from './ecc';
import { createEmptyGraph, addNode } from './pointGraph';
import { submitChallengePointAsSolution } from './submitSolution.ts';

// Mock the API and crypto functions
vi.mock('../services/api', () => ({
  challengeApi: {
    submitSolution: vi.fn(),
  },
}));

vi.mock('./crypto', () => ({
  generateSolutionFromPrivateKey: vi.fn(),
}));

vi.mock('./pointPrivateKey', () => ({
  calculatePrivateKeyFromGraph: vi.fn(),
}));

describe('submitSolution', () => {
  const mockGeneratorPoint = getGeneratorPoint();
  const mockChallengeUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('submitChallengePointAsSolution', () => {
    it('should return null if challenge node not found', async () => {
      const graph = createEmptyGraph();

      const result = await submitChallengePointAsSolution(
        mockChallengeUuid,
        graph,
        'nonexistent_node'
      );

      expect(result).toBeNull();
    });

    it('should submit challenge point when private key can be calculated', async () => {
      const { challengeApi } = await import('../services/api');
      const { generateSolutionFromPrivateKey } = await import('./crypto');
      const { calculatePrivateKeyFromGraph } = await import('./pointPrivateKey');

      const graph = createEmptyGraph();
      const challengeNode = addNode(graph, mockGeneratorPoint, {
        id: 'challenge',
        label: 'Challenge Point',
      });

      const mockSolution = { public_key: 'test_public_key', signature: 'test_signature' };
      const mockResponse = { uuid: 'solution_uuid', result: 'correct' };

      vi.mocked(calculatePrivateKeyFromGraph).mockReturnValue(123n);
      vi.mocked(generateSolutionFromPrivateKey).mockResolvedValue(mockSolution);
      vi.mocked(challengeApi.submitSolution).mockResolvedValue(mockResponse as any);

      const result = await submitChallengePointAsSolution(
        mockChallengeUuid,
        graph,
        challengeNode.id
      );

      expect(calculatePrivateKeyFromGraph).toHaveBeenCalledWith(mockGeneratorPoint, graph);
      expect(generateSolutionFromPrivateKey).toHaveBeenCalledWith(
        '0x000000000000000000000000000000000000000000000000000000000000007b',
        mockChallengeUuid
      );
      expect(challengeApi.submitSolution).toHaveBeenCalledWith(mockChallengeUuid, mockSolution);
      expect(result).toEqual(mockResponse);
    });
  });
});
