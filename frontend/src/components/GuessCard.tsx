import React, { useState } from 'react';
import type { GuessResponse } from '../types/api';
import './GuessCard.css';

interface GuessCardProps {
  guess: GuessResponse;
  guessNumber: number;
  targetAddress: string;
}

const GuessCard: React.FC<GuessCardProps> = ({ guess, guessNumber, targetAddress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getResultStatus = () => {
    if (guess.result === 'correct') return 'correct';
    if (guess.result === 'negated') return 'negated';
    if (guess.result === 'incorrect') {
      if (guess.is_key_valid === false) return 'invalid-key';
      if (guess.is_signature_valid === false) return 'invalid-signature';
      return 'incorrect';
    }
    return 'pending';
  };

  const getResultIcon = () => {
    const status = getResultStatus();
    switch (status) {
      case 'correct':
        return '🟩';
      case 'negated':
        return '🟨';
      case 'incorrect':
        return '🟥';
      case 'invalid-key':
        return '❌';
      case 'invalid-signature':
        return '🔐';
      default:
        return '⬜';
    }
  };

  const getResultText = () => {
    const status = getResultStatus();
    switch (status) {
      case 'correct':
        return 'Correct!';
      case 'negated':
        return 'Negated Key';
      case 'incorrect':
        return 'Wrong Key';
      case 'invalid-key':
        return 'Invalid Key';
      case 'invalid-signature':
        return 'Invalid Signature';
      default:
        return 'Processing...';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateKey = (key: string, length: number = 8) => {
    if (key.length <= length * 2) return key;
    return `${key.slice(0, length)}...${key.slice(-length)}`;
  };

  return (
    <div className={`guess-card ${getResultStatus()}`}>
      <div className="guess-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="guess-card-main">
          <div className="guess-number">#{guessNumber}</div>
          <div className="guess-result">
            <span className="result-icon">{getResultIcon()}</span>
            <span className="result-text">{getResultText()}</span>
          </div>
          <div className="guess-key">
            <code>{truncateKey(guess.public_key)}</code>
          </div>
        </div>
        <div className="expand-indicator">
          <span className={`caret ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {isExpanded && (
        <div className="guess-card-details">
          <div className="detail-section">
            <h4>Basic Information</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Submitted:</label>
                <span>{formatDate(guess.created_at)}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className="status-badges">
                  <span className={`badge ${guess.is_key_valid ? 'valid' : 'invalid'}`}>
                    Key: {guess.is_key_valid ? '✓' : '✗'}
                  </span>
                  <span className={`badge ${guess.is_signature_valid ? 'valid' : 'invalid'}`}>
                    Sig: {guess.is_signature_valid ? '✓' : '✗'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>Cryptographic Data</h4>
            <div className="crypto-data">
              <div className="crypto-field">
                <label>Public Key:</label>
                <code className="crypto-value">{guess.public_key}</code>
              </div>
              <div className="crypto-field">
                <label>Signature:</label>
                <code className="crypto-value">{guess.signature}</code>
              </div>
            </div>
          </div>

          {/* Placeholder for future advanced features */}
          <div className="detail-section advanced-section">
            <h4>Advanced Analysis</h4>
            <div className="placeholder-content">
              <div className="feature-placeholder">
                <span>🔑 Private Key Analysis</span>
                <small>Coming soon</small>
              </div>
              <div className="feature-placeholder">
                <span>📊 Curve Graph</span>
                <small>Coming soon</small>
              </div>
              <div className="feature-placeholder">
                <span>📈 Key Range Visualization</span>
                <small>Coming soon</small>
              </div>
              <div className="feature-placeholder">
                <span>🎯 Half/Double Points</span>
                <small>Coming soon</small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuessCard;
