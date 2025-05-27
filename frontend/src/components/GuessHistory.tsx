import React from 'react';
import { GuessResponse } from '../types/api';
import './GuessHistory.css';

interface GuessHistoryProps {
  guesses: GuessResponse[];
}

const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses }) => {
  if (guesses.length === 0) {
    return (
      <div className="guess-history-container">
        <h3>Your Guesses</h3>
        <div className="no-guesses">
          No guesses submitted yet. Make your first guess above!
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getResultIcon = (result: string | null, isKeyValid: boolean | null, isSignatureValid: boolean | null) => {
    if (result === 'correct') {
      return '✅';
    } else if (result === 'incorrect') {
      if (isKeyValid === false) {
        return '❌'; // Invalid key format
      } else if (isSignatureValid === false) {
        return '🔐'; // Invalid signature
      } else {
        return '❌'; // Wrong key
      }
    }
    return '⏳'; // Pending
  };

  const getResultText = (result: string | null, isKeyValid: boolean | null, isSignatureValid: boolean | null) => {
    if (result === 'correct') {
      return 'Correct! 🎉';
    } else if (result === 'incorrect') {
      if (isKeyValid === false) {
        return 'Invalid key format';
      } else if (isSignatureValid === false) {
        return 'Invalid signature';
      } else {
        return 'Incorrect key';
      }
    }
    return 'Processing...';
  };

  return (
    <div className="guess-history-container">
      <h3>Your Guesses ({guesses.length})</h3>
      <div className="guess-history">
        {guesses.map((guess, index) => (
          <div key={guess.uuid} className={`guess-item ${guess.result || 'pending'}`}>
            <div className="guess-header">
              <span className="guess-number">#{guesses.length - index}</span>
              <span className="guess-result">
                {getResultIcon(guess.result, guess.is_key_valid, guess.is_signature_valid)}
                {getResultText(guess.result, guess.is_key_valid, guess.is_signature_valid)}
              </span>
              <span className="guess-time">
                {formatDate(guess.created_at)}
              </span>
            </div>

            <div className="guess-details">
              <div className="guess-field">
                <label>Public Key:</label>
                <code className="guess-value">
                  {guess.public_key.length > 50
                    ? `${guess.public_key.slice(0, 25)}...${guess.public_key.slice(-25)}`
                    : guess.public_key
                  }
                </code>
              </div>

              <div className="guess-field">
                <label>Signature:</label>
                <code className="guess-value">
                  {guess.signature.length > 50
                    ? `${guess.signature.slice(0, 25)}...${guess.signature.slice(-25)}`
                    : guess.signature
                  }
                </code>
              </div>

              {guess.result && (
                <div className="validation-status">
                  <span className={`validation-item ${guess.is_key_valid ? 'valid' : 'invalid'}`}>
                    Key Format: {guess.is_key_valid ? '✓' : '✗'}
                  </span>
                  <span className={`validation-item ${guess.is_signature_valid ? 'valid' : 'invalid'}`}>
                    Signature: {guess.is_signature_valid ? '✓' : '✗'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuessHistory;
