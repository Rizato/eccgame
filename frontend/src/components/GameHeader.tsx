import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import StatsModal from './StatsModal';
import ThemeToggle from './ThemeToggle';

interface GameHeaderProps {
  showErrorBanner?: boolean;
  onOpenHowToPlay?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ showErrorBanner = false, onOpenHowToPlay }) => {
  const { error, clearError } = useGameStateRedux();
  const [showStats, setShowStats] = useState(false);
  const location = useLocation();

  const isGameRoute = ['/', '/practice'].includes(location.pathname);

  return (
    <>
      <header className="game-header">
        <div className="header-content">
          <div className="header-left">
            <Link to="/" className="site-title">
              <h1>ECC Crypto Playground</h1>
            </Link>
            {isGameRoute && (
              <nav className="nav-links">
                <Link to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}>
                  Daily
                </Link>
                <Link
                  to="/practice"
                  className={location.pathname === '/practice' ? 'nav-link active' : 'nav-link'}
                >
                  Practice
                </Link>
              </nav>
            )}
          </div>
          <div className="mode-controls">
            {isGameRoute && (
              <button
                className="stats-button"
                onClick={() => setShowStats(true)}
                title="Game Statistics"
                aria-label="View game statistics"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h4v8H3v-8zm6-5h4v13H9V8zm6-5h4v18h-4V3z" />
                </svg>
              </button>
            )}
            {!isGameRoute && (
              <nav className="nav-links">
                <Link
                  to="/faq"
                  className={location.pathname === '/faq' ? 'nav-link active' : 'nav-link'}
                >
                  FAQ
                </Link>
                <Link
                  to="/privacy"
                  className={location.pathname === '/privacy' ? 'nav-link active' : 'nav-link'}
                >
                  Privacy
                </Link>
              </nav>
            )}
            {onOpenHowToPlay && (
              <button className="how-to-play-button" onClick={onOpenHowToPlay} title="How to Play">
                ?
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
        {showErrorBanner && error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}
      </header>

      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
    </>
  );
};

export default GameHeader;
