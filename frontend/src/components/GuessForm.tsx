import React, { useState } from 'react';
import type { GuessRequest } from '../types/api';
import { isValidPublicKey, isValidSignature } from '../utils/crypto';
import './GuessForm.css';

interface GuessFormProps {
  onSubmit: (guess: GuessRequest) => Promise<void>;
  isLoading: boolean;
  remainingGuesses?: number;
}

const GuessForm: React.FC<GuessFormProps> = ({ onSubmit, isLoading, remainingGuesses }) => {
  const [publicKey, setPublicKey] = useState('');
  const [signature, setSignature] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!publicKey.trim()) {
      newErrors.publicKey = 'Public key is required';
    } else if (!isValidPublicKey(publicKey.trim())) {
      newErrors.publicKey = 'Invalid public key format (must be hex, 66 or 130 characters)';
    }

    if (!signature.trim()) {
      newErrors.signature = 'Signature is required';
    } else if (!isValidSignature(signature.trim())) {
      newErrors.signature = 'Invalid signature format (must be hex, 64-144 characters)';
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
      await onSubmit({
        public_key: publicKey.trim(),
        signature: signature.trim(),
      });

      // Clear form on successful submission
      setPublicKey('');
      setSignature('');
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
      console.error('Form submission error:', error);
    }
  };

  const isDisabled = isLoading || (remainingGuesses !== undefined && remainingGuesses <= 0);

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
          <label htmlFor="publicKey">
            Public Key:
            <span className="required">*</span>
          </label>
          <input
            type="text"
            id="publicKey"
            value={publicKey}
            onChange={e => setPublicKey(e.target.value)}
            placeholder="Enter the public key (hex format)"
            className={errors.publicKey ? 'error' : ''}
            disabled={isDisabled}
          />
          {errors.publicKey && <span className="error-message">{errors.publicKey}</span>}
          <small className="help-text">
            Enter the public key in hexadecimal format (66 characters for compressed, 130 for
            uncompressed)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="signature">
            Signature:
            <span className="required">*</span>
          </label>
          <textarea
            id="signature"
            value={signature}
            onChange={e => setSignature(e.target.value)}
            placeholder="Enter the cryptographic signature"
            rows={3}
            className={errors.signature ? 'error' : ''}
            disabled={isDisabled}
          />
          {errors.signature && <span className="error-message">{errors.signature}</span>}
          <small className="help-text">
            Enter the signature proving you control the private key
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
