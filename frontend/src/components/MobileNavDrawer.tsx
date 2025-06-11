import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import './MobileNavDrawer.css';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHowToPlay?: () => void;
}

const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose, onOpenHowToPlay }) => {
  const location = useLocation();

  if (!isOpen) return null;

  return createPortal(
    <div className="mobile-nav-overlay" onClick={onClose}>
      <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
        <div className="mobile-nav-header">
          <h3>Navigation</h3>
          <button onClick={onClose} className="mobile-nav-close">
            ×
          </button>
        </div>

        <nav className="mobile-nav-content">
          <div className="mobile-nav-section">
            <h4>Game Modes</h4>
            <Link
              to="/"
              className={location.pathname === '/' ? 'mobile-nav-link active' : 'mobile-nav-link'}
              onClick={onClose}
            >
              Daily Challenge
            </Link>
            <Link
              to="/practice"
              className={
                location.pathname === '/practice' ? 'mobile-nav-link active' : 'mobile-nav-link'
              }
              onClick={onClose}
            >
              Practice Mode
            </Link>
          </div>

          <div className="mobile-nav-section">
            <h4>Information</h4>
            {onOpenHowToPlay && (
              <button
                className="mobile-nav-link"
                onClick={() => {
                  onOpenHowToPlay();
                  onClose();
                }}
              >
                How to Play
              </button>
            )}
            <Link
              to="/faq"
              className={
                location.pathname === '/faq' ? 'mobile-nav-link active' : 'mobile-nav-link'
              }
              onClick={onClose}
            >
              FAQ
            </Link>
            <Link
              to="/privacy"
              className={
                location.pathname === '/privacy' ? 'mobile-nav-link active' : 'mobile-nav-link'
              }
              onClick={onClose}
            >
              Privacy Policy
            </Link>
          </div>
        </nav>
      </div>
    </div>,
    document.body
  );
};

export default MobileNavDrawer;
