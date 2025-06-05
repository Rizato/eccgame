import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getGeneratorPoint } from './ecc';
import {
  submitSaveToBackend,
  hasSubmittedSave,
  clearSubmittedSaves,
  getSubmittedSaveCount,
  submitSaveIfDaily,
} from './submitSaves';

// Mock the API
vi.mock('../services/api', () => ({
  challengeApi: {
    submitSave: vi.fn(),
  },
}));

describe('submitSaves', () => {
  const mockGeneratorPoint = getGeneratorPoint();
  const mockChallengeUuid = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    clearSubmittedSaves();
  });

  describe('hasSubmittedSave', () => {
    it('should return false for infinity points', () => {
      const infinityPoint = { x: 0n, y: 0n, isInfinity: true };
      const result = hasSubmittedSave(mockChallengeUuid, infinityPoint);
      expect(result).toBe(false);
    });

    it('should return false for new points', () => {
      const result = hasSubmittedSave(mockChallengeUuid, mockGeneratorPoint);
      expect(result).toBe(false);
    });

    it('should return true after submitting a save', async () => {
      const { challengeApi } = await import('../services/api');
      const mockResponse = {
        uuid: 'save_uuid',
        public_key: 'test_key',
        created_at: '2023-01-01T00:00:00Z',
        challenge: mockChallengeUuid,
      };

      vi.mocked(challengeApi.submitSave).mockResolvedValue(mockResponse);

      // Submit save
      await submitSaveToBackend(mockChallengeUuid, mockGeneratorPoint, 'Test Point');

      // Check if tracked
      const result = hasSubmittedSave(mockChallengeUuid, mockGeneratorPoint);
      expect(result).toBe(true);
    });
  });

  describe('submitSaveToBackend', () => {
    it('should skip infinity points', async () => {
      const infinityPoint = { x: 0n, y: 0n, isInfinity: true };
      const result = await submitSaveToBackend(mockChallengeUuid, infinityPoint, 'Infinity');

      expect(result).toBeNull();
    });

    it('should submit new saves successfully', async () => {
      const { challengeApi } = await import('../services/api');
      const mockResponse = {
        uuid: 'save_uuid',
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        created_at: '2023-01-01T00:00:00Z',
        challenge: mockChallengeUuid,
      };

      vi.mocked(challengeApi.submitSave).mockResolvedValue(mockResponse);

      const result = await submitSaveToBackend(mockChallengeUuid, mockGeneratorPoint, 'Test Point');

      expect(challengeApi.submitSave).toHaveBeenCalledWith(mockChallengeUuid, {
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      });
      expect(result).toEqual(mockResponse);
      expect(getSubmittedSaveCount()).toBe(1);
    });

    it('should not re-submit already submitted saves', async () => {
      const { challengeApi } = await import('../services/api');
      const mockResponse = {
        uuid: 'save_uuid',
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        created_at: '2023-01-01T00:00:00Z',
        challenge: mockChallengeUuid,
      };

      vi.mocked(challengeApi.submitSave).mockResolvedValue(mockResponse);

      // Submit first time
      const result1 = await submitSaveToBackend(
        mockChallengeUuid,
        mockGeneratorPoint,
        'Test Point'
      );
      expect(result1).toEqual(mockResponse);

      // Try to submit again
      const result2 = await submitSaveToBackend(
        mockChallengeUuid,
        mockGeneratorPoint,
        'Test Point Again'
      );
      expect(result2).toBeNull();

      // Should only have been called once
      expect(challengeApi.submitSave).toHaveBeenCalledTimes(1);
      expect(getSubmittedSaveCount()).toBe(1);
    });

    it('should handle submission errors gracefully', async () => {
      const { challengeApi } = await import('../services/api');
      vi.mocked(challengeApi.submitSave).mockRejectedValue(new Error('Network error'));

      const result = await submitSaveToBackend(mockChallengeUuid, mockGeneratorPoint, 'Test Point');

      expect(result).toBeNull();
      expect(getSubmittedSaveCount()).toBe(0);
    });
  });

  describe('clearSubmittedSaves', () => {
    it('should clear all submitted save tracking', async () => {
      const { challengeApi } = await import('../services/api');
      const mockResponse = {
        uuid: 'save_uuid',
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        created_at: '2023-01-01T00:00:00Z',
        challenge: mockChallengeUuid,
      };

      vi.mocked(challengeApi.submitSave).mockResolvedValue(mockResponse);

      // Submit a save
      await submitSaveToBackend(mockChallengeUuid, mockGeneratorPoint, 'Test Point');
      expect(getSubmittedSaveCount()).toBe(1);

      // Clear tracking
      clearSubmittedSaves();
      expect(getSubmittedSaveCount()).toBe(0);

      // Should be able to submit again
      const result = await submitSaveToBackend(
        mockChallengeUuid,
        mockGeneratorPoint,
        'Test Point Again'
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('submitSaveIfDaily', () => {
    it('should not submit for practice mode', async () => {
      const result = await submitSaveIfDaily(
        mockChallengeUuid,
        'practice',
        mockGeneratorPoint,
        'Test Point'
      );
      expect(result).toBeNull();
    });

    it('should not submit without challenge UUID', async () => {
      const result = await submitSaveIfDaily(undefined, 'daily', mockGeneratorPoint, 'Test Point');
      expect(result).toBeNull();
    });

    it('should submit for daily mode with UUID', async () => {
      const { challengeApi } = await import('../services/api');
      const mockResponse = {
        uuid: 'save_uuid',
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        created_at: '2023-01-01T00:00:00Z',
        challenge: mockChallengeUuid,
      };

      vi.mocked(challengeApi.submitSave).mockResolvedValue(mockResponse);

      const result = await submitSaveIfDaily(
        mockChallengeUuid,
        'daily',
        mockGeneratorPoint,
        'Test Point'
      );

      expect(challengeApi.submitSave).toHaveBeenCalledWith(mockChallengeUuid, {
        public_key: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
