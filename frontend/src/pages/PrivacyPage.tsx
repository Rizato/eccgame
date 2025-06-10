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
          </section>

          <section className="privacy-section">
            <h2>Analytics</h2>
            <p>
              We want to process as little personal information as possible when you use our
              website. That's why we've chosen Fathom Analytics for our website analytics, which
              doesn't use cookies and complies with the GDPR, ePrivacy (including PECR), COPPA and
              CCPA. Using this privacy-friendly website analytics software, your IP address is only
              briefly processed, and we (running this website) have no way of identifying you. As
              per the CCPA, your personal information is de-identified. You can read more about this
              on Fathom Analytics' website.
            </p>
            <p>
              The purpose of us using this software is to understand our website traffic in the most
              privacy-friendly way possible so that we can continually improve our website and
              business. The lawful basis as per the GDPR is "Article 6(1)(f); where our legitimate
              interests are to improve our website and business continually." As per the
              explanation, no personal data is stored over time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
