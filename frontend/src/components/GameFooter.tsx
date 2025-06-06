import React from 'react';
import { Link } from 'react-router-dom';
import './GameFooter.css';

const GameFooter: React.FC = () => {
  return (
    <footer className="game-footer">
      <div className="footer-content">
        <div className="footer-links">
          <Link to="/faq" className="footer-link">
            FAQ
          </Link>
          <span className="footer-separator">•</span>
          <Link to="/privacy" className="footer-link">
            Privacy Policy
          </Link>
        </div>
        <div className="footer-copyright">© 2024 ECC Crypto Playground</div>
      </div>
    </footer>
  );
};

export default GameFooter;
