import { describe, expect, it, vi } from 'vitest';
import { createEmptyGraph, addNode } from './pointGraph';
import { getGeneratorPoint } from './ecc';
import { submitChallengePointAsGuess } from './submitGuess.ts';

// Mock the API and crypto functions
vi.mock('../services/api', () => ({
  challengeApi: {
    submitGuess: vi.fn(),
  },
}));

vi.mock('./crypto', () => ({
  generateGuessFromPrivateKey: vi.fn(),
}));

vi.mock('./pointPrivateKey', () => ({
  calculatePrivateKeyFromGraph: vi.fn(),
}));

describe('submitGuess', () => {
  const mockGeneratorPoint = getGeneratorPoint();
  const mockChallengeUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('submitChallengePointAsGuess', () => {
    it('should return null if challenge node not found', async () => {
      const graph = createEmptyGraph();

      const result = await submitChallengePointAsGuess(
        mockChallengeUuid,
        graph,
        'nonexistent_node'
      );

      expect(result).toBeNull();
    });

    it('should submit challenge point when private key can be calculated', async () => {
      const { challengeApi } = await import('../services/api');
      const { generateGuessFromPrivateKey } = await import('./crypto');
      const { calculatePrivateKeyFromGraph } = await import('./pointPrivateKey');

      const graph = createEmptyGraph();
      const challengeNode = addNode(graph, mockGeneratorPoint, {
        id: 'challenge',
        label: 'Challenge Point',
      });

      const mockGuess = { public_key: 'test_public_key', signature: 'test_signature' };
      const mockResponse = { uuid: 'guess_uuid', result: 'correct' };

      vi.mocked(calculatePrivateKeyFromGraph).mockReturnValue(123n);
      vi.mocked(generateGuessFromPrivateKey).mockResolvedValue(mockGuess);
      vi.mocked(challengeApi.submitGuess).mockResolvedValue(mockResponse as any);

      const result = await submitChallengePointAsGuess(mockChallengeUuid, graph, challengeNode.id);

      expect(calculatePrivateKeyFromGraph).toHaveBeenCalledWith(mockGeneratorPoint, graph);
      expect(generateGuessFromPrivateKey).toHaveBeenCalledWith(
        '0x000000000000000000000000000000000000000000000000000000000000007b',
        mockChallengeUuid
      );
      expect(challengeApi.submitGuess).toHaveBeenCalledWith(mockChallengeUuid, mockGuess);
      expect(result).toEqual(mockResponse);
    });
  });
});
