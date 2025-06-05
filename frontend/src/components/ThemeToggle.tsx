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

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const getThemeIcon = (themeOption: Theme) => {
    switch (themeOption) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'system':
        return '💻';
    }
  };

  const getThemeLabel = (themeOption: Theme) => {
    switch (themeOption) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  return (
    <div className="theme-toggle">
      <label htmlFor="theme-select" className="theme-toggle-label">
        Theme:
      </label>
      <select
        id="theme-select"
        value={theme}
        onChange={e => handleThemeChange(e.target.value as Theme)}
        className="theme-select"
      >
        {(['light', 'dark', 'system'] as const).map(themeOption => (
          <option key={themeOption} value={themeOption}>
            {getThemeIcon(themeOption)} {getThemeLabel(themeOption)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeToggle;
