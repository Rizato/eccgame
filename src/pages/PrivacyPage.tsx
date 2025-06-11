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
          <p className="last-updated">Last Updated: June 10, 2025</p>
        </header>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>Overview</h2>
            <p>
              This Privacy Policy explains how ECC Crypto Playground collects, uses, and protects
              your information when you use our website. We are committed to protecting your privacy
              and handling your data in an open and transparent manner.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Information We Collect</h2>
            <p>
              We collect no personal information whatsoever. This cryptography playground operates
              entirely client-side without data collection, tracking, or analytics.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Cryptographic Privacy</h2>
            <p>
              All private keys and cryptographic operations remain completely private to your
              browser. No private keys, public keys, calculations, or cryptographic data are ever
              transmitted to our servers or any third parties.
            </p>
          </section>

          <section className="privacy-section">
            <h2>No Analytics or Tracking</h2>
            <p>
              We do not use any analytics services, tracking pixels, cookies, or data collection
              mechanisms. There are no third-party scripts that monitor your behavior or collect
              usage statistics.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Local Storage</h2>
            <p>
              We do not use local storage, session storage, or cookies to store any game state or
              user data. The application data is entirely ephemeral, and cleared on refresh.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Third-Party Services</h2>
            <p>
              We do not use any third-party services, analytics platforms, tracking pixels, or
              external resources that could collect your data. The application runs entirely
              self-contained with no external dependencies that process user data.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Data Security</h2>
            <p>
              Since we collect no data and all cryptographic operations happen locally in your
              browser, there is minimal security risk. The website is served over HTTPS to ensure
              secure communication.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Your Rights</h2>
            <p>
              Since we don't collect any personal data or use any tracking, there is no personal
              data to access, modify, or delete.
            </p>
          </section>

          <section className="privacy-section">
            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted on
              this page with an updated "Last Updated" date. Continued use of the site after changes
              constitutes acceptance of the new policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
