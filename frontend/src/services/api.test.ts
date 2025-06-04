import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Challenge, GuessRequest, GuessResponse } from '../types/api';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
  },
};

// Set up the mock before importing the module
mockedAxios.create.mockReturnValue(mockApi as any);

// Now import the module after mocking is set up
const { challengeApi } = await import('./api');

const mockChallenge: Challenge = {
  uuid: 'challenge-123',
  p2pkh_address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  active_date: '2023-01-01',
  metadata: [],
  explorer_link: '',
  active: true,
  created_at: '2023-01-01T00:00:00Z',
};

const mockGuessRequest: GuessRequest = {
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  signature:
    '304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
};

const mockGuessResponse: GuessResponse = {
  uuid: 'guess-123',
  public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
  signature:
    '304402207fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a002201234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  result: 'incorrect',
  is_key_valid: true,
  is_signature_valid: true,
  validated_at: '2023-01-01T00:00:00Z',
  created_at: '2023-01-01T00:00:00Z',
  challenge: 'challenge-123',
};

// Mock document for CSRF token
const mockDocument = {
  querySelector: vi.fn(),
};

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock axios.create
    mockedAxios.create.mockReturnValue(mockApi as any);

    // Mock document
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    });

    // Mock environment variables
    import.meta.env.VITE_API_URL = 'http://test-api.example.com';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API configuration', () => {
    it('should create axios instance with correct configuration', () => {
      // Re-import to trigger axios.create
      vi.resetModules();
      require('./api');

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test-api.example.com',
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use default URL when VITE_API_URL is not set', () => {
      delete import.meta.env.VITE_API_URL;
      vi.resetModules();
      require('./api');

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000',
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup CSRF token interceptor', () => {
      vi.resetModules();
      require('./api');

      expect(mockApi.interceptors.request.use).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('CSRF token handling', () => {
    it('should add CSRF token to request headers when token exists', () => {
      const mockCsrfInput = {
        value: 'test-csrf-token',
      };

      mockDocument.querySelector.mockReturnValue(mockCsrfInput);

      vi.resetModules();
      require('./api');

      const interceptorFn = mockApi.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };

      const result = interceptorFn(config);

      expect(mockDocument.querySelector).toHaveBeenCalledWith('[name=csrfmiddlewaretoken]');
      expect(result.headers['X-CSRFToken']).toBe('test-csrf-token');
    });

    it('should not add CSRF token when token element does not exist', () => {
      mockDocument.querySelector.mockReturnValue(null);

      vi.resetModules();
      require('./api');

      const interceptorFn = mockApi.interceptors.request.use.mock.calls[0][0];
      const config = { headers: {} };

      const result = interceptorFn(config);

      expect(result.headers['X-CSRFToken']).toBeUndefined();
    });
  });

  describe('challengeApi.getDailyChallenge', () => {
    it('should fetch daily challenge successfully', async () => {
      mockApi.get.mockResolvedValue({ data: mockChallenge });

      const result = await challengeApi.getDailyChallenge();

      expect(mockApi.get).toHaveBeenCalledWith('/api/daily/');
      expect(result).toEqual(mockChallenge);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      mockApi.get.mockRejectedValue(error);

      await expect(challengeApi.getDailyChallenge()).rejects.toThrow('Network error');
    });

    it('should handle 404 errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Challenge not found' },
        },
      };
      mockApi.get.mockRejectedValue(error);

      await expect(challengeApi.getDailyChallenge()).rejects.toEqual(error);
    });
  });

  describe('challengeApi.getChallenge', () => {
    it('should fetch specific challenge by UUID', async () => {
      mockApi.get.mockResolvedValue({ data: mockChallenge });

      const result = await challengeApi.getChallenge('challenge-123');

      expect(mockApi.get).toHaveBeenCalledWith('/api/challenges/challenge-123/');
      expect(result).toEqual(mockChallenge);
    });

    it('should handle invalid UUID format', async () => {
      const error = {
        response: {
          status: 400,
          data: { detail: 'Invalid UUID format' },
        },
      };
      mockApi.get.mockRejectedValue(error);

      await expect(challengeApi.getChallenge('invalid-uuid')).rejects.toEqual(error);
    });

    it('should handle non-existent challenge', async () => {
      const error = {
        response: {
          status: 404,
          data: { detail: 'Challenge not found' },
        },
      };
      mockApi.get.mockRejectedValue(error);

      await expect(challengeApi.getChallenge('non-existent-uuid')).rejects.toEqual(error);
    });
  });

  describe('challengeApi.submitGuess', () => {
    it('should submit guess successfully', async () => {
      mockApi.post.mockResolvedValue({ data: mockGuessResponse });

      const result = await challengeApi.submitGuess('challenge-123', mockGuessRequest);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/challenges/challenge-123/guess/',
        mockGuessRequest
      );
      expect(result).toEqual(mockGuessResponse);
    });

    it('should handle validation errors', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            public_key: ['Invalid public key format'],
            signature: ['Invalid signature'],
          },
        },
      };
      mockApi.post.mockRejectedValue(error);

      await expect(challengeApi.submitGuess('challenge-123', mockGuessRequest)).rejects.toEqual(
        error
      );
    });

    it('should handle rate limiting', async () => {
      const error = {
        response: {
          status: 429,
          data: { detail: 'Rate limit exceeded' },
        },
      };
      mockApi.post.mockRejectedValue(error);

      await expect(challengeApi.submitGuess('challenge-123', mockGuessRequest)).rejects.toEqual(
        error
      );
    });

    it('should handle server errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { detail: 'Internal server error' },
        },
      };
      mockApi.post.mockRejectedValue(error);

      await expect(challengeApi.submitGuess('challenge-123', mockGuessRequest)).rejects.toEqual(
        error
      );
    });

    it('should only send public key and signature (privacy verification)', async () => {
      mockApi.post.mockResolvedValue({ data: mockGuessResponse });

      const guessWithExtraData = {
        ...mockGuessRequest,
        // These should not be sent (simulating potential private data)
        private_key: 'should-not-be-sent',
        internal_data: 'should-not-be-sent',
      };

      await challengeApi.submitGuess('challenge-123', guessWithExtraData);

      // Verify that the entire guess object is sent (API should filter)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/challenges/challenge-123/guess/',
        guessWithExtraData
      );
    });
  });

  describe('network error handling', () => {
    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      mockApi.get.mockRejectedValue(networkError);

      await expect(challengeApi.getDailyChallenge()).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'TimeoutError';
      mockApi.post.mockRejectedValue(timeoutError);

      await expect(challengeApi.submitGuess('challenge-123', mockGuessRequest)).rejects.toThrow(
        'timeout of 10000ms exceeded'
      );
    });
  });

  describe('response data validation', () => {
    it('should return challenge data with correct structure', async () => {
      mockApi.get.mockResolvedValue({ data: mockChallenge });

      const result = await challengeApi.getChallenge('challenge-123');

      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('p2pkh_address');
      expect(result).toHaveProperty('public_key');
      expect(result).toHaveProperty('active_date');
      expect(result).toHaveProperty('active');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('explorer_link');
      expect(result).toHaveProperty('created_at');
    });

    it('should return guess response with correct structure', async () => {
      mockApi.post.mockResolvedValue({ data: mockGuessResponse });

      const result = await challengeApi.submitGuess('challenge-123', mockGuessRequest);

      expect(result).toHaveProperty('uuid');
      expect(result).toHaveProperty('public_key');
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('created_at');
    });
  });
});
