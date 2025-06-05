const STORAGE_PREFIX = 'cryptoguesser_';
const DAILY_WINS_KEY = `${STORAGE_PREFIX}daily_wins`;

export const storageUtils = {
  // Daily challenge win tracking
  markWonToday: (challengeUuid: string): void => {
    try {
      const today = new Date().toDateString();
      const winData = { challengeUuid, date: today };
      localStorage.setItem(DAILY_WINS_KEY, JSON.stringify(winData));
    } catch (error) {
      console.warn('Failed to mark daily win:', error);
    }
  },

  hasWonToday: (challengeUuid: string): boolean => {
    try {
      const stored = localStorage.getItem(DAILY_WINS_KEY);
      if (!stored) return false;

      const winData = JSON.parse(stored);
      const today = new Date().toDateString();

      return winData.challengeUuid === challengeUuid && winData.date === today;
    } catch (error) {
      console.warn('Failed to check daily win status:', error);
      return false;
    }
  },
};
