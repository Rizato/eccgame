import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.tsx';
import './index.css';
import { store } from './store';
import { themeUtils } from './utils/theme';

// Apply theme immediately before React renders to prevent flash
const savedTheme = themeUtils.getStoredTheme();
themeUtils.applyTheme(savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
