import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleTheme } from '../store/slices/themeSlice';
import { themeUtils } from '../utils/theme';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.theme.theme);

  useEffect(() => {
    // Apply theme on mount and when it changes
    themeUtils.applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const getThemeIcon = () => {
    return theme === 'light' ? '☀' : '🌘︎'; // Show moon when dark, sun when light
  };

  return (
    <button
      onClick={handleToggleTheme}
      className="theme-toggle-button"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Currently ${theme} mode. Click to switch to ${theme === 'light' ? 'dark' : 'light'} mode.`}
    >
      <span className="theme-icon">{getThemeIcon()}</span>
    </button>
  );
};

export default ThemeToggle;
