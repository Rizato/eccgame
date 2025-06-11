import { lazy, Suspense, useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingState from './components/LoadingState';
import ECCGamePage from './pages/ECCGamePage';
import { useAppSelector } from './store/hooks';
import { themeUtils } from './utils/theme';

// Lazy load non-critical routes
const FAQPage = lazy(() => import('./pages/FAQPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

function App() {
  const theme = useAppSelector(state => state.theme.theme);

  // Apply theme on initial load
  useEffect(() => {
    themeUtils.applyTheme(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<ECCGamePage mode="daily" />} />
            <Route path="/practice" element={<ECCGamePage mode="practice" />} />
            <Route
              path="/faq"
              element={
                <Suspense fallback={<LoadingState />}>
                  <FAQPage />
                </Suspense>
              }
            />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={<LoadingState />}>
                  <PrivacyPage />
                </Suspense>
              }
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
