export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'cryptoguesser_theme';

export const themeUtils = {
  // Get the current theme from localStorage or default to 'system'
  getStoredTheme: (): Theme => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return (stored as Theme) || 'system';
    } catch {
      return 'system';
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

  // Get the effective theme (resolve 'system' to actual theme)
  getEffectiveTheme: (theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
      return themeUtils.getSystemTheme();
    }
    return theme;
  },

  // Apply theme to document
  applyTheme: (theme: Theme): void => {
    const effectiveTheme = themeUtils.getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);

    // Also set a class for backward compatibility
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${effectiveTheme}-theme`);
  },
};
