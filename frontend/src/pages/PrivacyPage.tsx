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
            <h2>Fully Local Operation</h2>
            <p>
              This application runs entirely in your browser. No data is transmitted to any server.
              All cryptographic operations, challenge verification, and game state are handled
              locally.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Private Key Handling</h2>
            <p>
              Your private keys are generated and stored only in your browser's memory. They are
              never transmitted or stored anywhere else. All cryptographic operations occur
              client-side.
            </p>
          </section>

          <section className="privacy-section">
            <h2>No Data Collection</h2>
            <p>
              We do not collect, store, or transmit any personal data, game statistics, or usage
              analytics. There are no cookies, session tracking, or server communications.
            </p>
          </section>

          <section className="privacy-section">
            <h2>No Local Storage</h2>
            <p>
              This application does not use localStorage, sessionStorage, or any other persistent
              storage mechanisms. All game state is ephemeral and resets when you refresh the page
              or close your browser.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Challenge Data</h2>
            <p>
              Challenge data is loaded from a static configuration file included with the
              application. No external API calls or data fetching occurs during gameplay.
            </p>
          </section>

          <section className="privacy-section">
            <h2>EU Privacy Compliance</h2>
            <p>
              This privacy-first approach ensures full compliance with GDPR and other privacy
              regulations without requiring user consent mechanisms or data processing agreements.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
