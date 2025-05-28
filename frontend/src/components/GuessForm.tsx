import React, { useState, useEffect } from 'react';
import { isValidPrivateKey } from '../utils/crypto';
import './GuessForm.css';

interface GuessFormProps {
  onSubmit: (privateKey: string) => Promise<void>;
  isLoading: boolean;
  remainingGuesses?: number;
  compact?: boolean;
}

type KeyEntryMethod = 'hex' | 'ascii' | 'slider' | 'zork' | 'personality' | 'wheel' | 'checkboxes';
type PaddingMode = 'pre' | 'post' | 'none';

const GuessForm: React.FC<GuessFormProps> = ({
  onSubmit,
  isLoading,
  remainingGuesses,
  compact = false,
}) => {
  const [binaryData, setBinaryData] = useState<Uint8Array>(new Uint8Array(32));
  const [entryMethod, setEntryMethod] = useState<KeyEntryMethod>('hex');
  const [hexValue, setHexValue] = useState('');
  const [asciiValue, setAsciiValue] = useState('');
  const [paddingMode, setPaddingMode] = useState<PaddingMode>('none');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Convert binary data to hex string
  const binaryToHex = (data: Uint8Array): string => {
    return Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Convert hex string to binary data
  const hexToBinary = (hex: string): Uint8Array => {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
    const result = new Uint8Array(32);

    for (let i = 0; i < Math.min(cleanHex.length / 2, 32); i++) {
      result[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }

    return result;
  };

  // Convert ASCII to binary data with padding
  const asciiToBinary = (text: string, padding: PaddingMode): Uint8Array => {
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const result = new Uint8Array(32);

    if (textBytes.length >= 32) {
      result.set(textBytes.slice(0, 32));
    } else {
      switch (padding) {
        case 'pre':
          result.set(textBytes, 32 - textBytes.length);
          break;
        case 'post':
          result.set(textBytes, 0);
          break;
        case 'none':
          result.set(textBytes, 0);
          break;
      }
    }

    return result;
  };

  // Convert binary data to ASCII
  const binaryToAscii = (data: Uint8Array): string => {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let start = 0;
      let end = data.length;

      while (start < data.length && data[start] === 0) start++;
      while (end > start && data[end - 1] === 0) end--;

      if (start >= end) return '';

      const contentBytes = data.slice(start, end);
      return decoder.decode(contentBytes);
    } catch {
      return Array.from(data)
        .map(b => (b === 0 ? '' : b >= 32 && b <= 126 ? String.fromCharCode(b) : '□'))
        .join('')
        .replace(/□+$/, '')
        .replace(/^□+/, '');
    }
  };

  // Update displays when binary data changes
  useEffect(() => {
    const newHex = binaryToHex(binaryData);
    const newAscii = binaryToAscii(binaryData);

    setHexValue(newHex);
    setAsciiValue(newAscii);
  }, [binaryData]);

  // Handle hex input change
  const handleHexChange = (value: string) => {
    const newBinary = hexToBinary(value);
    setBinaryData(newBinary);
    if (errors.privateKey) {
      setErrors(prev => ({ ...prev, privateKey: '' }));
    }
  };

  // Handle ASCII input change
  const handleAsciiChange = (value: string) => {
    const newBinary = asciiToBinary(value, paddingMode);
    setBinaryData(newBinary);
    if (errors.privateKey) {
      setErrors(prev => ({ ...prev, privateKey: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const privateKey = binaryToHex(binaryData);

    if (!privateKey || !privateKey.trim()) {
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
      await onSubmit(binaryToHex(binaryData));
      setBinaryData(new Uint8Array(32));
      setErrors({});
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const entryMethods = [
    { value: 'hex', label: 'Hexadecimal', description: 'Traditional 64-character hex input' },
    { value: 'ascii', label: 'ASCII/Unicode', description: 'Text input with padding options' },
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
  const isValidKey = binaryData.some(b => b !== 0);

  return (
    <form onSubmit={handleSubmit} className="guess-form">
      <div className="key-entry-layout">
        {/* Left side: Binary/Hex view */}
        <div className="key-preview-section">
          <div className="entry-method-selector">
            <div className="method-dropdown-container">
              <label htmlFor="entryMethod">Entry Method:</label>
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
          </div>

          <div className="preview-header">
            <h4>Key Data Preview</h4>
            <span className={`status-indicator ${isValidKey ? 'valid' : 'invalid'}`}>
              {isValidKey ? '✓ Valid key data' : '⚠ Empty key'}
            </span>
          </div>

          <div className="binary-preview">
            <label>Binary Data (32 bytes):</label>
            <div className="binary-grid">
              {Array.from(binaryData).map((byte, index) => (
                <span
                  key={index}
                  className={`byte ${byte === 0 ? 'zero' : 'nonzero'}`}
                  title={`Byte ${index}: ${byte} (0x${byte.toString(16).padStart(2, '0')})`}
                >
                  {byte.toString(16).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>

          <div className="format-displays">
            <div className="format-display">
              <label>Hex:</label>
              <code className="format-value">{hexValue || '(empty)'}</code>
            </div>
            <div className="format-display">
              <label>ASCII:</label>
              <code className="format-value">{asciiValue || '(empty)'}</code>
            </div>
          </div>
        </div>

        {/* Right side: Input controls */}
        <div className="key-input-section">
          {entryMethod === 'hex' ? (
            <div className="hex-input">
              <label htmlFor="hex-field">Hexadecimal (64 characters):</label>
              <input
                id="hex-field"
                type="text"
                value={hexValue}
                onChange={e => handleHexChange(e.target.value)}
                placeholder="Enter 64 character hex string..."
                className={`hex-field ${errors.privateKey ? 'error' : ''}`}
                disabled={isDisabled}
                maxLength={64}
              />
              <small className="help-text">
                Enter a 256-bit private key as hexadecimal (0-9, a-f)
              </small>
            </div>
          ) : entryMethod === 'ascii' ? (
            <div className="ascii-input">
              <div className="ascii-header">
                <label htmlFor="ascii-field">ASCII/Unicode Text:</label>
                <div className="padding-selector">
                  <label>Padding:</label>
                  <select
                    value={paddingMode}
                    onChange={e => setPaddingMode(e.target.value as PaddingMode)}
                    disabled={isDisabled}
                  >
                    <option value="none">None</option>
                    <option value="pre">Pre-pad with zeros</option>
                    <option value="post">Post-pad with zeros</option>
                  </select>
                </div>
              </div>
              <textarea
                id="ascii-field"
                value={asciiValue}
                onChange={e => handleAsciiChange(e.target.value)}
                placeholder="Enter text to convert to private key..."
                className={`ascii-field ${errors.privateKey ? 'error' : ''}`}
                disabled={isDisabled}
                rows={4}
                maxLength={32}
              />
              <small className="help-text">
                Text will be UTF-8 encoded to bytes. Max 32 characters/bytes.
              </small>
            </div>
          ) : (
            <div className="coming-soon-placeholder">
              <div className="placeholder-icon">🚧</div>
              <h4>{entryMethods.find(m => m.value === entryMethod)?.label}</h4>
              <p>{entryMethods.find(m => m.value === entryMethod)?.description}</p>
              <small>
                This exciting key entry method is coming soon! Switch to Hexadecimal or ASCII to
                play now.
              </small>
            </div>
          )}

          {errors.privateKey && <div className="error-message">{errors.privateKey}</div>}

          <button type="submit" className="submit-button" disabled={isDisabled}>
            {isLoading ? 'Submitting...' : 'Submit Guess'}
          </button>

          {remainingGuesses !== undefined && remainingGuesses <= 0 && (
            <div className="no-guesses-warning">
              You have used all your guesses for this challenge. Try again tomorrow!
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default GuessForm;
