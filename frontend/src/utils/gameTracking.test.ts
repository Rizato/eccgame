import { describe, it, expect, beforeEach } from 'vitest';
import { storageUtils } from './storage';

describe('Game Tracking', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Game Started Tracking', () => {
    it('should track when a game is started', () => {
      const challengeUuid = 'test-challenge-123';

      // Initially not started
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(false);

      // Mark as started
      storageUtils.markGameStarted(challengeUuid);

      // Should now be started
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(true);

      console.log('✅ Game started tracking works correctly');
    });

    it('should handle multiple different challenges', () => {
      const challenge1 = 'challenge-1';
      const challenge2 = 'challenge-2';

      // Mark first challenge as started
      storageUtils.markGameStarted(challenge1);

      // First should be started, second should not
      expect(storageUtils.hasGameStarted(challenge1)).toBe(true);
      expect(storageUtils.hasGameStarted(challenge2)).toBe(false);

      // Mark second challenge as started
      storageUtils.markGameStarted(challenge2);

      // Both should now be started
      expect(storageUtils.hasGameStarted(challenge1)).toBe(true);
      expect(storageUtils.hasGameStarted(challenge2)).toBe(true);

      console.log('✅ Multiple challenge tracking works correctly');
    });

    it('should persist game started state in localStorage', () => {
      const challengeUuid = 'persistent-challenge';

      // Mark as started
      storageUtils.markGameStarted(challengeUuid);
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(true);

      // Check that data is actually in localStorage
      const stored = localStorage.getItem('ecccryptoplayground_games_started');
      expect(stored).toBeTruthy();

      const data = JSON.parse(stored!);
      expect(data[challengeUuid]).toBeTruthy();
      expect(data[challengeUuid].timestamp).toBeTruthy();

      console.log('✅ Game started state persists in localStorage');
    });
  });

  describe('Integration with existing win tracking', () => {
    it('should work alongside address-based win tracking', () => {
      const challengeUuid = 'integration-test-challenge';
      const address = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

      // Initially nothing is tracked
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(false);
      expect(storageUtils.hasWonByAddress(address)).toBe(false);

      // Start game (first operation)
      storageUtils.markGameStarted(challengeUuid);
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(true);
      expect(storageUtils.hasWonByAddress(address)).toBe(false);

      // Win game
      storageUtils.markWonByAddress(address);
      expect(storageUtils.hasGameStarted(challengeUuid)).toBe(true);
      expect(storageUtils.hasWonByAddress(address)).toBe(true);

      console.log('✅ Game started and win tracking work together');
    });
  });
});
