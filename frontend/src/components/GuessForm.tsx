import React, { useState } from 'react';
import { isValidPrivateKey } from '../utils/crypto';
import './GuessForm.css';

interface GuessFormProps {
  onSubmit: (privateKey: string) => Promise<void>;
  isLoading: boolean;
  remainingGuesses?: number;
  compact?: boolean;
}

const GuessForm: React.FC<GuessFormProps> = ({
  onSubmit,
  isLoading,
  remainingGuesses,
  compact = false,
}) => {
  const [privateKey, setPrivateKey] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!privateKey.trim()) {
      newErrors.privateKey = 'Private key is required';
    } else if (!isValidPrivateKey(privateKey.trim())) {
      newErrors.privateKey =
        'Invalid private key format (must be 64 character hex string / 256 bits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(privateKey.trim());

      // Clear form on successful submission
      setPrivateKey('');
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
      console.error('Form submission error:', error);
    }
  };

  const isDisabled = isLoading || (remainingGuesses !== undefined && remainingGuesses <= 0);

  if (compact) {
    return (
      <div className="guess-form-inline">
        <form onSubmit={handleSubmit} className="guess-form-compact">
          <div className="form-group-inline">
            <input
              type="text"
              value={privateKey}
              onChange={e => setPrivateKey(e.target.value)}
              placeholder="Enter private key (64 character hex)"
              className={errors.privateKey ? 'error' : ''}
              disabled={isDisabled}
              maxLength={66}
            />
            <button type="submit" className="submit-button-compact" disabled={isDisabled}>
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          {errors.privateKey && <span className="error-message-inline">{errors.privateKey}</span>}
        </form>
      </div>
    );
  }

  return (
    <div className="guess-form-container">
      <div className="guess-form-header">
        <h3>Submit Your Guess</h3>
        {remainingGuesses !== undefined && (
          <span className={`remaining-guesses ${remainingGuesses <= 1 ? 'warning' : ''}`}>
            {remainingGuesses} guess{remainingGuesses !== 1 ? 'es' : ''} remaining
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="guess-form">
        <div className="form-group">
          <label htmlFor="privateKey">
            Private Key:
            <span className="required">*</span>
          </label>
          <input
            type="text"
            id="privateKey"
            value={privateKey}
            onChange={e => setPrivateKey(e.target.value)}
            placeholder="Enter the private key (64 character hex string)"
            className={errors.privateKey ? 'error' : ''}
            disabled={isDisabled}
            maxLength={66} // Allow for 0x prefix
          />
          {errors.privateKey && <span className="error-message">{errors.privateKey}</span>}
          <small className="help-text">
            Enter a 256-bit private key in hexadecimal format (64 characters). Public key and
            signature will be generated automatically.
          </small>
        </div>

        <button type="submit" className="submit-button" disabled={isDisabled}>
          {isLoading ? 'Submitting...' : 'Submit Guess'}
        </button>

        {remainingGuesses !== undefined && remainingGuesses <= 0 && (
          <div className="no-guesses-warning">
            You have used all your guesses for this challenge. Try again tomorrow!
          </div>
        )}
      </form>
    </div>
  );
};

export default GuessForm;
