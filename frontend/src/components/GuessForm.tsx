import React, { useState } from 'react';
import { isValidPrivateKey } from '../utils/crypto';
import AdvancedKeyEntry from './AdvancedKeyEntry';
import './GuessForm.css';

interface GuessFormProps {
  onSubmit: (privateKey: string) => Promise<void>;
  isLoading: boolean;
  remainingGuesses?: number;
  compact?: boolean;
}

type KeyEntryMethod =
  | 'hex'
  | 'advanced'
  | 'slider'
  | 'zork'
  | 'personality'
  | 'wheel'
  | 'checkboxes';

const GuessForm: React.FC<GuessFormProps> = ({
  onSubmit,
  isLoading,
  remainingGuesses,
  compact = false,
}) => {
  const [privateKey, setPrivateKey] = useState('');
  const [entryMethod, setEntryMethod] = useState<KeyEntryMethod>('hex');
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

  const handleKeyChange = (newPrivateKey: string) => {
    setPrivateKey(newPrivateKey);
    // Clear errors when key changes
    if (errors.privateKey) {
      setErrors(prev => ({ ...prev, privateKey: '' }));
    }
  };

  const entryMethods = [
    { value: 'hex', label: 'Hexadecimal', description: 'Traditional 64-character hex input' },
    {
      value: 'advanced',
      label: 'Advanced Formats',
      description: 'Hex, ASCII, with padding options',
    },
    {
      value: 'slider',
      label: 'Zooming Slider',
      description: 'Fast navigation with precision zoom (Coming Soon)',
    },
    {
      value: 'zork',
      label: 'Text Adventure',
      description: 'Generate keys through story choices (Coming Soon)',
    },
    {
      value: 'personality',
      label: 'Personality Test',
      description: 'Answer questions to build your key (Coming Soon)',
    },
    {
      value: 'wheel',
      label: 'Combination Lock',
      description: 'iPod-style wheel interface (Coming Soon)',
    },
    {
      value: 'checkboxes',
      label: '256 Checkboxes',
      description: 'Direct bit manipulation (Coming Soon)',
    },
  ] as const;

  const isDisabled = isLoading || (remainingGuesses !== undefined && remainingGuesses <= 0);

  if (compact) {
    return (
      <div className="guess-form-inline">
        <form onSubmit={handleSubmit} className="guess-form-compact">
          <div className="entry-method-selector compact">
            <div className="method-dropdown-container">
              <label htmlFor="entryMethod-compact">Method:</label>
              <select
                id="entryMethod-compact"
                value={entryMethod}
                onChange={e => setEntryMethod(e.target.value as KeyEntryMethod)}
                disabled={isDisabled}
                className="method-dropdown"
              >
                {entryMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {entryMethod === 'hex' ? (
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
          ) : entryMethod === 'advanced' ? (
            <div className="advanced-entry-compact">
              <AdvancedKeyEntry onKeyChange={handleKeyChange} disabled={isDisabled} />
              <button type="submit" className="submit-button-compact" disabled={isDisabled}>
                {isLoading ? '⏳' : '➤'}
              </button>
            </div>
          ) : (
            <div className="coming-soon-compact">
              <span>
                🚧 {entryMethods.find(m => m.value === entryMethod)?.label} - Coming Soon!
              </span>
            </div>
          )}

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
        <div className="entry-method-selector">
          <div className="method-dropdown-container">
            <label htmlFor="entryMethod">Key Entry Method:</label>
            <select
              id="entryMethod"
              value={entryMethod}
              onChange={e => setEntryMethod(e.target.value as KeyEntryMethod)}
              disabled={isDisabled}
              className="method-dropdown"
            >
              {entryMethods.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div className="method-description">
            {entryMethods.find(m => m.value === entryMethod)?.description}
          </div>
        </div>

        <div className="key-entry-area">
          {entryMethod === 'advanced' ? (
            <AdvancedKeyEntry onKeyChange={handleKeyChange} disabled={isDisabled} />
          ) : entryMethod === 'hex' ? (
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
          ) : (
            <div className="coming-soon-placeholder">
              <div className="placeholder-icon">🚧</div>
              <h4>{entryMethods.find(m => m.value === entryMethod)?.label}</h4>
              <p>{entryMethods.find(m => m.value === entryMethod)?.description}</p>
              <small>
                This exciting key entry method is coming soon! Switch to Hexadecimal or Advanced
                Formats to play now.
              </small>
            </div>
          )}
        </div>

        {errors.privateKey && entryMethod !== 'hex' && (
          <div className="error-message">{errors.privateKey}</div>
        )}

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
