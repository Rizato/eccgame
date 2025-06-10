import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { themeUtils } from '../utils/theme';
import ThemeToggle from './ThemeToggle';

// Mock the theme utils
vi.mock('../utils/theme', () => ({
  themeUtils: {
    getStoredTheme: vi.fn(),
    setStoredTheme: vi.fn(),
    applyTheme: vi.fn(),
    watchSystemTheme: vi.fn(),
    getSystemTheme: vi.fn(() => 'light'), // Add this mock
  },
}));

const mockThemeUtils = vi.mocked(themeUtils);

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render theme toggle button', () => {
      render(<ThemeToggle />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByLabelText(/switch to.*mode/i)).toBeInTheDocument();
    });

    it('should show correct icon for current theme', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('light');
      render(<ThemeToggle />);

      // When in light mode, should show moon (to switch to dark)
      expect(screen.getByText('☀')).toBeInTheDocument();
    });

    it('should show sun icon when in dark mode', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('dark');
      render(<ThemeToggle />);

      // When in dark mode, should show sun (to switch to light)
      expect(screen.getByText('🌘︎')).toBeInTheDocument();
    });
  });

  describe('theme initialization', () => {
    it('should apply initial theme on mount', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('dark');

      render(<ThemeToggle />);

      expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('theme changing', () => {
    it('should toggle from light to dark when clicked', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('light');
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light when clicked', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('dark');
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith('light');
    });

    it('should update icon when clicking to toggle theme', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('light');
      render(<ThemeToggle />);

      // Initially in light mode, should show moon
      expect(screen.getByText('☀')).toBeInTheDocument();

      // Click to toggle to dark mode
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should now show sun (we're now in dark mode)
      expect(screen.getByText('🌘︎')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('light');
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
      expect(button).toHaveAttribute(
        'title',
        'Currently light mode. Click to switch to dark mode.'
      );
    });

    it('should update ARIA attributes when theme changes', () => {
      mockThemeUtils.getSystemTheme.mockReturnValue('dark');
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
      expect(button).toHaveAttribute(
        'title',
        'Currently dark mode. Click to switch to light mode.'
      );
    });

    it('should be keyboard accessible', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');

      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();

      // Should respond to keyboard events
      fireEvent.keyDown(button, { key: 'Enter' });
      fireEvent.keyDown(button, { key: ' ' });
    });
  });

  describe('edge cases', () => {
    it('should handle invalid stored theme gracefully', () => {
      // @ts-expect-error - testing invalid theme
      mockThemeUtils.getStoredTheme.mockReturnValue('invalid-theme');

      expect(() => render(<ThemeToggle />)).not.toThrow();
    });

    it('should handle rapid theme changes', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');

      // Clear initial calls
      mockThemeUtils.applyTheme.mockClear();

      // Rapidly click to toggle themes
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockThemeUtils.applyTheme).toHaveBeenCalledTimes(3);
    });
  });
});
