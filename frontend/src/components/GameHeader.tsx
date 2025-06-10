import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  openHowToPlayModal,
  openMobileNav,
  selectShowMobileNav,
  selectShowErrorBanner,
} from '../store/slices/uiSlice';
import ThemeToggle from './ThemeToggle';
import MobileNavDrawer from './MobileNavDrawer';

interface GameHeaderProps {
  showErrorBanner?: boolean;
}

const GameHeader: React.FC<GameHeaderProps> = ({ showErrorBanner }) => {
  const { error, clearError } = useGameStateRedux();
  const dispatch = useAppDispatch();
  const showMobileNav = useAppSelector(selectShowMobileNav);
  const showErrorBannerState = useAppSelector(selectShowErrorBanner);
  const location = useLocation();

  const isGameRoute = ['/', '/practice'].includes(location.pathname);

  return (
    <>
      <header className="game-header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="mobile-nav-button"
              onClick={() => dispatch(openMobileNav())}
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
              <h1>ECC Crypto Playground</h1>
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
            {isGameRoute && (
              <button
                className="how-to-play-button"
                onClick={() => dispatch(openHowToPlayModal())}
                title="How to Play"
              >
                ?
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
        {(showErrorBanner ?? showErrorBannerState) && error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}
      </header>

      <MobileNavDrawer />
    </>
  );
};

export default GameHeader;
