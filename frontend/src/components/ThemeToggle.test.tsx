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
  },
}));

const mockThemeUtils = vi.mocked(themeUtils);

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockThemeUtils.getStoredTheme.mockReturnValue('light');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render theme toggle with label', () => {
      render(<ThemeToggle />);

      expect(screen.getByText('Theme:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all theme options', () => {
      render(<ThemeToggle />);

      screen.getByRole('combobox');

      expect(screen.getByText('☀️ Light')).toBeInTheDocument();
      expect(screen.getByText('🌙 Dark')).toBeInTheDocument();
      expect(screen.getByText('💻 System')).toBeInTheDocument();
    });

    it('should show correct initial theme from storage', () => {
      mockThemeUtils.getStoredTheme.mockReturnValue('dark');

      render(<ThemeToggle />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('dark');
    });
  });

  describe('theme initialization', () => {
    it('should apply initial theme on mount', () => {
      mockThemeUtils.getStoredTheme.mockReturnValue('dark');

      render(<ThemeToggle />);

      expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('theme changing', () => {
    it('should change theme when selection changes', () => {
      render(<ThemeToggle />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'dark' } });

      expect(mockThemeUtils.setStoredTheme).toHaveBeenCalledWith('dark');
      expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith('dark');
    });

    it('should update internal state when theme changes', () => {
      render(<ThemeToggle />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'system' } });

      expect(select.value).toBe('system');
    });

    it('should handle all theme options', () => {
      render(<ThemeToggle />);

      const select = screen.getByRole('combobox');

      // Test each theme option
      const themes = ['light', 'dark', 'system'];
      themes.forEach(theme => {
        fireEvent.change(select, { target: { value: theme } });

        expect(mockThemeUtils.setStoredTheme).toHaveBeenCalledWith(theme);
        expect(mockThemeUtils.applyTheme).toHaveBeenCalledWith(theme);
      });
    });
  });

  describe('theme icons and labels', () => {
    it('should display correct icons for each theme', () => {
      render(<ThemeToggle />);

      // Check that icons are present in the options
      expect(screen.getByText(/☀️/)).toBeInTheDocument(); // Light
      expect(screen.getByText(/🌙/)).toBeInTheDocument(); // Dark
      expect(screen.getByText(/💻/)).toBeInTheDocument(); // System
    });

    it('should display correct labels for each theme', () => {
      render(<ThemeToggle />);

      expect(screen.getByText(/Light/)).toBeInTheDocument();
      expect(screen.getByText(/Dark/)).toBeInTheDocument();
      expect(screen.getByText(/System/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ThemeToggle />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('id', 'theme-select');

      const label = screen.getByText('Theme:');
      expect(label).toHaveAttribute('for', 'theme-select');
    });

    it('should be keyboard accessible', () => {
      render(<ThemeToggle />);

      const select = screen.getByRole('combobox');

      // Should be focusable
      select.focus();
      expect(select).toHaveFocus();

      // Should respond to keyboard events
      fireEvent.keyDown(select, { key: 'ArrowDown' });
      fireEvent.keyDown(select, { key: 'Enter' });
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

      const select = screen.getByRole('combobox');

      // Clear initial calls
      mockThemeUtils.setStoredTheme.mockClear();
      mockThemeUtils.applyTheme.mockClear();

      // Rapidly change themes
      fireEvent.change(select, { target: { value: 'dark' } });
      fireEvent.change(select, { target: { value: 'light' } });
      fireEvent.change(select, { target: { value: 'system' } });

      expect(mockThemeUtils.setStoredTheme).toHaveBeenCalledTimes(3);
      expect(mockThemeUtils.applyTheme).toHaveBeenCalledTimes(3); // 3 changes
    });
  });
});
