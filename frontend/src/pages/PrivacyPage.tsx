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
            <h2>Private Key Handling</h2>
            <p>
              Your private key is never transmitted to or stored by our servers. All signing and
              public key derivation occurs in your browser.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Session Data</h2>
            <p>
              A temporary session ID is assigned via a cookie for each browsing session. This ID is
              used in guess validation to prevent reuse or guess flooding. It is discarded after
              each verified guess and is never linked to personal identity.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Guess Submissions</h2>
            <p>
              Guesses are verified server-side using a signature over your derived public key, the
              current day, and your temporary session ID.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Analytics & Logging</h2>
            <p>
              We may store aggregate, anonymous statistics such as total guess counts or timing
              distributions. We do not store IP addresses or user identifiers.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Local Storage</h2>
            <p>
              Your guess history and local stats are stored only in your browser using localStorage.
              They are never transmitted.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Contact & Data Requests</h2>
            <p>
              Since we do not collect personal data, we have no way to identify or process any
              deletion or export requests.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
