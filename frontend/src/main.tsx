import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { themeUtils } from './utils/theme';

// Apply theme immediately before React renders to prevent flash
const savedTheme = themeUtils.getStoredTheme();
themeUtils.applyTheme(savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
