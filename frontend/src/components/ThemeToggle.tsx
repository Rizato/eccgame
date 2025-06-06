import React, { useEffect, useState } from 'react';
import { type Theme, themeUtils } from '../utils/theme';
import './ThemeToggle.css';

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => themeUtils.getStoredTheme());

  useEffect(() => {
    // Apply initial theme
    themeUtils.applyTheme(theme);
    themeUtils.setStoredTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const getThemeIcon = () => {
    return theme === 'light' ? '☀' : '🌘︎'; // Show moon when dark, sun when light
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-button"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Currently ${theme} mode. Click to switch to ${theme === 'light' ? 'dark' : 'light'} mode.`}
    >
      <span className="theme-icon">{getThemeIcon()}</span>
    </button>
  );
};

export default ThemeToggle;
