import { lazy, Suspense } from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import ECCGamePage from './pages/ECCGamePage';
import LoadingState from './components/LoadingState';

// Lazy load non-critical routes
const FAQPage = lazy(() => import('./pages/FAQPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));

function App() {
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
