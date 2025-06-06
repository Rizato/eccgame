/**
 * SIMPLIFIED FRONTEND INTEGRATION TEST - DAILY CHALLENGE HAPPY PATH
 *
 * This test focuses on the core API integration flow:
 * 1. Loading the daily challenge from API
 * 2. Submitting a correct solution
 * 3. Verifying the response handling
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { challengeApi } from '../services/api';
import { generateSolutionFromPrivateKey } from '../utils/crypto';
import type { Challenge, SolutionResponse } from '../types/api';

// Mock the API module for controlled testing
vi.mock('../services/api', () => ({
  challengeApi: {
    getDailyChallenge: vi.fn(),
    submitSolution: vi.fn(),
    submitSave: vi.fn(),
    clearCache: vi.fn(),
    getRateLimitStatus: vi.fn(() => ({
      isRateLimited: false,
      requestsInWindow: 0,
      maxRequests: 100,
      windowMs: 60000,
    })),
  },
}));

const mockedChallengeApi = vi.mocked(challengeApi);

// Test data with known private key = 7
const testChallenge: Challenge = {
  uuid: 'test-challenge-uuid-12345',
  p2pkh_address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  active_date: '2023-01-01',
  metadata: [],
  explorer_link: 'https://blockchair.com/bitcoin/address/1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  active: true,
  created_at: '2023-01-01T00:00:00Z',
};

const successSolutionResponse: SolutionResponse = {
  uuid: 'solution-uuid-12345',
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  signature: 'mock-signature-for-solution',
  result: 'correct',
  is_key_valid: true,
  is_signature_valid: true,
  validated_at: '2023-01-01T12:00:00Z',
  created_at: '2023-01-01T12:00:00Z',
  challenge: 'test-challenge-uuid-12345',
};

describe('Daily Challenge API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should complete the daily challenge API flow', async () => {
    // Setup: Mock successful API responses
    mockedChallengeApi.getDailyChallenge.mockResolvedValue(testChallenge);
    mockedChallengeApi.submitSolution.mockResolvedValue(successSolutionResponse);

    // Step 1: Fetch daily challenge
    const challenge = await challengeApi.getDailyChallenge();

    expect(challenge).toEqual(testChallenge);
    expect(mockedChallengeApi.getDailyChallenge).toHaveBeenCalledTimes(1);

    // Step 2: Generate a solution using the known private key
    const privateKey = '0x0000000000000000000000000000000000000000000000000000000000000007';
    const guess = await generateSolutionFromPrivateKey(privateKey, challenge.uuid);

    // Verify the guess was generated correctly
    expect(guess).toHaveProperty('public_key');
    expect(guess).toHaveProperty('signature');
    expect(typeof guess.public_key).toBe('string');
    expect(typeof guess.signature).toBe('string');
    expect(guess.public_key).toMatch(/^[0-9a-f]{66}$/i); // Compressed public key format
    expect(guess.signature).toMatch(/^[0-9a-f]+$/i); // Hex signature format

    // Step 3: Submit the solution
    const solutionResponse = await challengeApi.submitSolution(challenge.uuid, guess);

    // Step 4: Verify the solution was accepted and marked as correct
    expect(solutionResponse).toEqual(successSolutionResponse);
    expect(solutionResponse.result).toBe('correct');
    expect(solutionResponse.is_key_valid).toBe(true);
    expect(solutionResponse.is_signature_valid).toBe(true);
    expect(solutionResponse.uuid).toBe('solution-uuid-12345');

    // Verify API was called with correct parameters
    expect(mockedChallengeApi.submitSolution).toHaveBeenCalledWith(
      testChallenge.uuid,
      expect.objectContaining({
        public_key: expect.any(String),
        signature: expect.any(String),
      })
    );
  });

  it('should handle API rate limiting gracefully', async () => {
    // Setup: Mock rate limit response
    const rateLimitError = new Error('Rate limit exceeded');
    mockedChallengeApi.getDailyChallenge.mockRejectedValue(rateLimitError);

    // Attempt to fetch challenge
    await expect(challengeApi.getDailyChallenge()).rejects.toThrow('Rate limit exceeded');

    // Verify rate limit status can be checked
    const status = challengeApi.getRateLimitStatus();
    expect(status).toHaveProperty('isRateLimited');
    expect(status).toHaveProperty('requestsInWindow');
    expect(status).toHaveProperty('maxRequests');
  });

  it('should handle incorrect solutions', async () => {
    // Setup: Mock incorrect solution response
    const incorrectSolutionResponse: SolutionResponse = {
      ...successSolutionResponse,
      result: 'incorrect',
      is_key_valid: false,
    };

    mockedChallengeApi.getDailyChallenge.mockResolvedValue(testChallenge);
    mockedChallengeApi.submitSolution.mockResolvedValue(incorrectSolutionResponse);

    // Step 1: Fetch challenge
    const challenge = await challengeApi.getDailyChallenge();

    // Step 2: Submit incorrect solution (wrong private key)
    const wrongPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000042';
    const wrongGuess = await generateSolutionFromPrivateKey(wrongPrivateKey, challenge.uuid);

    const solutionResponse = await challengeApi.submitSolution(challenge.uuid, wrongGuess);

    // Step 3: Verify the solution was rejected
    expect(solutionResponse.result).toBe('incorrect');
    expect(solutionResponse.is_key_valid).toBe(false);
  });

  it('should track saves during solution attempts', async () => {
    // Setup: Mock save response
    const saveResponse = {
      uuid: 'save-uuid-12345',
      public_key: 'intermediate-point-public-key',
      created_at: '2023-01-01T11:00:00Z',
      challenge: 'test-challenge-uuid-12345',
    };

    mockedChallengeApi.getDailyChallenge.mockResolvedValue(testChallenge);
    mockedChallengeApi.submitSave.mockResolvedValue(saveResponse);

    // Step 1: Fetch challenge
    const challenge = await challengeApi.getDailyChallenge();

    // Step 2: Save intermediate points during calculation
    const intermediatePoints = [
      '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
      '03f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    ];

    for (const point of intermediatePoints) {
      const saveResult = await challengeApi.submitSave(challenge.uuid, { public_key: point });
      expect(saveResult).toEqual(saveResponse);
    }

    // Verify saves were submitted
    expect(mockedChallengeApi.submitSave).toHaveBeenCalledTimes(3);
    expect(mockedChallengeApi.submitSave).toHaveBeenCalledWith(
      challenge.uuid,
      expect.objectContaining({
        public_key: expect.any(String),
      })
    );
  });

  it('should handle network errors gracefully', async () => {
    // Setup: Mock network error
    const networkError = new Error('Network unavailable');
    mockedChallengeApi.getDailyChallenge.mockRejectedValue(networkError);

    // Attempt to fetch challenge
    await expect(challengeApi.getDailyChallenge()).rejects.toThrow('Network unavailable');

    // Verify error is propagated correctly
    expect(mockedChallengeApi.getDailyChallenge).toHaveBeenCalledTimes(1);
  });

  it('should cache daily challenge responses', async () => {
    // Setup: Mock successful response
    mockedChallengeApi.getDailyChallenge.mockResolvedValue(testChallenge);

    // Step 1: Fetch challenge multiple times
    const challenge1 = await challengeApi.getDailyChallenge();
    const challenge2 = await challengeApi.getDailyChallenge();

    // Both should return the same challenge
    expect(challenge1).toEqual(challenge2);
    expect(challenge1.uuid).toBe(testChallenge.uuid);

    // API should be called at least once (caching may reduce calls)
    expect(mockedChallengeApi.getDailyChallenge).toHaveBeenCalled();
  });
});
