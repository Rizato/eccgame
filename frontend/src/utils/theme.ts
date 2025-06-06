export type Theme = 'light' | 'dark';

const THEME_PREFIX = 'ecccryptoplayground_';
const THEME_STORAGE_KEY = `${THEME_PREFIX}theme`;

export const themeUtils = {
  // Get the current theme from localStorage or default to system preference
  getStoredTheme: (): Theme => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && (stored === 'light' || stored === 'dark')) {
        return stored as Theme;
      }
      // If no theme stored, use system preference but store it as actual theme
      const systemTheme = themeUtils.getSystemTheme();
      themeUtils.setStoredTheme(systemTheme);
      return systemTheme;
    } catch {
      const systemTheme = themeUtils.getSystemTheme();
      return systemTheme;
    }
  },

  // Save theme preference to localStorage
  setStoredTheme: (theme: Theme): void => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  },

  // Check if system prefers dark mode
  getSystemTheme: (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  },

  // Apply theme to document
  applyTheme: (theme: Theme): void => {
    document.documentElement.setAttribute('data-theme', theme);

    // Also set a class for backward compatibility
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${theme}-theme`);
  },
};
