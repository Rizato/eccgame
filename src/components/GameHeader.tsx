import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import MobileNavDrawer from './MobileNavDrawer';
import ThemeToggle from './ThemeToggle';

interface GameHeaderProps {
  showErrorBanner?: boolean;
  onOpenHowToPlay?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ showErrorBanner = false, onOpenHowToPlay }) => {
  const { error, clearError } = useGameStateRedux();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const location = useLocation();

  const isGameRoute = ['/', '/practice'].includes(location.pathname);

  return (
    <>
      <header className="game-header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="mobile-nav-button"
              onClick={() => setShowMobileNav(true)}
              aria-label="Open navigation menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link to="/" className="site-title">
              <h1>ECC Game</h1>
            </Link>
            {isGameRoute && (
              <nav className="nav-links desktop-nav">
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
            {!isGameRoute && (
              <nav className="nav-links desktop-nav">
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
      </header>

      {showErrorBanner && error && (
        <div className="error-banner-absolute">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <MobileNavDrawer
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
        onOpenHowToPlay={onOpenHowToPlay}
      />
    </>
  );
};

export default GameHeader;
