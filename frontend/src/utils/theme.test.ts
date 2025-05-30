import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { themeUtils, type Theme } from './theme';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window.matchMedia
const mockMatchMedia = vi.fn();

// Mock document
const mockDocument = {
  documentElement: {
    setAttribute: vi.fn(),
    classList: {
      remove: vi.fn(),
      add: vi.fn(),
    },
  },
};

describe('themeUtils', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();

    // Setup global mocks
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
    });

    Object.defineProperty(window, 'matchMedia', {
      value: mockMatchMedia,
    });

    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStoredTheme', () => {
    it('should return stored theme from localStorage', () => {
      mockLocalStorage.setItem('cryptoguesser_theme', 'dark');

      const theme = themeUtils.getStoredTheme();

      expect(theme).toBe('dark');
    });

    it('should return "system" when no theme is stored', () => {
      const theme = themeUtils.getStoredTheme();

      expect(theme).toBe('system');
    });

    it('should return "system" when localStorage throws error', () => {
      vi.spyOn(mockLocalStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const theme = themeUtils.getStoredTheme();

      expect(theme).toBe('system');
    });

    it('should validate theme values', () => {
      const validThemes: Theme[] = ['light', 'dark', 'system'];

      validThemes.forEach(theme => {
        mockLocalStorage.setItem('cryptoguesser_theme', theme);
        expect(themeUtils.getStoredTheme()).toBe(theme);
      });
    });
  });

  describe('setStoredTheme', () => {
    it('should save theme to localStorage', () => {
      themeUtils.setStoredTheme('dark');

      expect(mockLocalStorage.getItem('cryptoguesser_theme')).toBe('dark');
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(mockLocalStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      expect(() => themeUtils.setStoredTheme('dark')).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save theme preference:',
        expect.any(Error)
      );
    });
  });

  describe('getSystemTheme', () => {
    it('should return "dark" when system prefers dark mode', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
      });

      const theme = themeUtils.getSystemTheme();

      expect(theme).toBe('dark');
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should return "light" when system prefers light mode', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
      });

      const theme = themeUtils.getSystemTheme();

      expect(theme).toBe('light');
    });

    it('should return "light" when matchMedia is not available', () => {
      // @ts-expect-error - testing undefined matchMedia
      delete window.matchMedia;

      const theme = themeUtils.getSystemTheme();

      expect(theme).toBe('light');
    });

    it('should return "light" in non-browser environment', () => {
      // Mock server-side environment
      const originalWindow = global.window;
      // @ts-expect-error - testing undefined window
      delete global.window;

      const theme = themeUtils.getSystemTheme();

      expect(theme).toBe('light');

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return actual theme for non-system themes', () => {
      expect(themeUtils.getEffectiveTheme('light')).toBe('light');
      expect(themeUtils.getEffectiveTheme('dark')).toBe('dark');
    });

    it('should resolve system theme to actual system preference', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
      });

      expect(themeUtils.getEffectiveTheme('system')).toBe('dark');

      mockMatchMedia.mockReturnValue({
        matches: false, // System prefers light
      });

      expect(themeUtils.getEffectiveTheme('system')).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('should apply theme attributes and classes to document', () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // System prefers light
      });

      themeUtils.applyTheme('light');

      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
      expect(mockDocument.documentElement.classList.remove).toHaveBeenCalledWith(
        'light-theme',
        'dark-theme'
      );
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('light-theme');
    });

    it('should resolve system theme before applying', () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
      });

      themeUtils.applyTheme('system');

      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('dark-theme');
    });
  });

  describe('watchSystemTheme', () => {
    it('should setup media query listener for system theme changes', () => {
      const mockMediaQuery = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        matches: false,
      };

      mockMatchMedia.mockReturnValue(mockMediaQuery);

      const callback = vi.fn();
      const cleanup = themeUtils.watchSystemTheme(callback);

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      // Test callback execution
      const [eventType, handler] = mockMediaQuery.addEventListener.mock.calls[0];
      expect(eventType).toBe('change');

      // Simulate theme change event
      handler({ matches: true } as MediaQueryListEvent);
      expect(callback).toHaveBeenCalledWith('dark');

      handler({ matches: false } as MediaQueryListEvent);
      expect(callback).toHaveBeenCalledWith('light');

      // Test cleanup
      cleanup();
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('should return noop cleanup function when matchMedia is not available', () => {
      // @ts-expect-error - testing undefined matchMedia
      delete window.matchMedia;

      const callback = vi.fn();
      const cleanup = themeUtils.watchSystemTheme(callback);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return noop cleanup function in non-browser environment', () => {
      const originalWindow = global.window;
      // @ts-expect-error - testing undefined window
      delete global.window;

      const callback = vi.fn();
      const cleanup = themeUtils.watchSystemTheme(callback);

      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
      expect(callback).not.toHaveBeenCalled();

      // Restore window
      global.window = originalWindow;
    });
  });

  describe('integration tests', () => {
    it('should work through complete theme lifecycle', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      // Start with no theme stored
      expect(themeUtils.getStoredTheme()).toBe('system');
      expect(themeUtils.getEffectiveTheme('system')).toBe('light');

      // Set and apply dark theme
      themeUtils.setStoredTheme('dark');
      themeUtils.applyTheme('dark');

      expect(themeUtils.getStoredTheme()).toBe('dark');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');

      // Switch to system theme
      themeUtils.setStoredTheme('system');
      themeUtils.applyTheme('system');

      expect(themeUtils.getStoredTheme()).toBe('system');
      expect(mockDocument.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light');
    });
  });
});
