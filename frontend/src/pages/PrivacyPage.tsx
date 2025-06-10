import React from 'react';
import { Link } from 'react-router-dom';
import './PrivacyPage.css';

const PrivacyPage: React.FC = () => {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <Link to="/" className="back-link">
            ← Back to Game
          </Link>
          <h1>Privacy Policy</h1>
        </header>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>Local Operation</h2>
            <p>
              This application runs entirely in your browser. All cryptographic operations,
              challenge verification, and key generation are handled locally.
            </p>
            <p>
              Nothing is stored in cookies or local storage, and no requests are made to any
              servers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
