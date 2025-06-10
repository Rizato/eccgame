import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Theme, themeUtils } from './theme';

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
