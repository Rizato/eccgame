import React from 'react';
import './PlaceholderLayout.css';

interface PlaceholderLayoutProps {
  message?: string;
  isPracticeMode?: boolean;
}

const PlaceholderLayout: React.FC<PlaceholderLayoutProps> = ({
  message = "Loading today's challenge...",
  isPracticeMode = false,
}) => {
  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <div className="placeholder-content">
            <div className="challenge-header">
              <h4 className="address-heading">
                {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
              </h4>
              <div className="header-actions">
                {isPracticeMode && <div className="placeholder-button">New Challenge ▼</div>}
                {!isPracticeMode && <div className="placeholder-button">Give Up</div>}
              </div>
            </div>
            <div className="info-section">
              <div className="address-row">
                <div className="placeholder-address">{message}</div>
                {!isPracticeMode && <div className="placeholder-explorer">View Explorer</div>}
              </div>
            </div>
            {isPracticeMode && (
              <div className="info-section">
                <label>Private Key:</label>
                <div className="placeholder-private-key">Generating...</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="playground-container">
        <div className="placeholder-playground">
          <div className="placeholder-graph">
            <div className="placeholder-graph-header">
              <div className="placeholder-title">ECC Graph</div>
              <div className="placeholder-legend">
                <div className="placeholder-legend-item"></div>
                <div className="placeholder-legend-item"></div>
                <div className="placeholder-legend-item"></div>
              </div>
            </div>
            <div className="placeholder-graph-area"></div>
          </div>
          <div className="placeholder-calculator">
            <div className="placeholder-calculator-header">Calculator</div>
            <div className="placeholder-buttons">
              <div className="placeholder-button-row">
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
              </div>
              <div className="placeholder-button-row">
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
                <div className="placeholder-calc-button"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderLayout;
