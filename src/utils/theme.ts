export type Theme = 'light' | 'dark' | 'system';

export const themeUtils = {
  // Check if system prefers dark mode, default to dark if not available
  getSystemTheme: (): 'light' | 'dark' => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark mode
  },

  // Apply theme to document
  applyTheme: (theme: Theme): void => {
    const normalized = theme === 'system' ? themeUtils.getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', normalized);

    // Also set a class for backward compatibility
    document.documentElement.classList.remove('light-theme', 'dark-theme');
    document.documentElement.classList.add(`${normalized}-theme`);
  },
};
