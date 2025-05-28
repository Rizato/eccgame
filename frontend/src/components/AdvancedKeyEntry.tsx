import React, { useState, useEffect } from 'react';
import './AdvancedKeyEntry.css';

type KeyFormat = 'hex' | 'ascii';
type PaddingMode = 'pre' | 'post' | 'none';

interface AdvancedKeyEntryProps {
  onKeyChange: (privateKeyHex: string) => void;
  disabled?: boolean;
}

const AdvancedKeyEntry: React.FC<AdvancedKeyEntryProps> = ({ onKeyChange, disabled = false }) => {
  const [keyFormat, setKeyFormat] = useState<KeyFormat>('hex');
  const [paddingMode, setPaddingMode] = useState<PaddingMode>('none');
  const [binaryData, setBinaryData] = useState<Uint8Array>(new Uint8Array(32)); // 32 bytes = 256 bits
  const [hexValue, setHexValue] = useState('');
  const [asciiValue, setAsciiValue] = useState('');

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
      // Truncate if too long
      result.set(textBytes.slice(0, 32));
    } else {
      // Apply padding
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

  // Convert binary data to ASCII (with handling for non-printable chars)
  const binaryToAscii = (data: Uint8Array): string => {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      // Find the actual content (remove padding zeros)
      let start = 0;
      let end = data.length;

      // Remove leading zeros for pre-padding
      while (start < data.length && data[start] === 0) start++;

      // Remove trailing zeros for post-padding
      while (end > start && data[end - 1] === 0) end--;

      if (start >= end) return '';

      const contentBytes = data.slice(start, end);
      return decoder.decode(contentBytes);
    } catch {
      // Return placeholder for non-UTF8 data
      return Array.from(data)
        .map(b => (b === 0 ? '' : b >= 32 && b <= 126 ? String.fromCharCode(b) : '□'))
        .join('')
        .replace(/□+$/, '') // Remove trailing placeholders
        .replace(/^□+/, ''); // Remove leading placeholders
    }
  };

  // Update displays when binary data changes
  useEffect(() => {
    const newHex = binaryToHex(binaryData);
    const newAscii = binaryToAscii(binaryData);

    setHexValue(newHex);
    setAsciiValue(newAscii);

    // Notify parent component
    onKeyChange(newHex);
  }, [binaryData, onKeyChange]);

  // Handle format change
  const handleFormatChange = (newFormat: KeyFormat) => {
    setKeyFormat(newFormat);
  };

  // Handle hex input change
  const handleHexChange = (value: string) => {
    const newBinary = hexToBinary(value);
    setBinaryData(newBinary);
  };

  // Handle ASCII input change
  const handleAsciiChange = (value: string) => {
    const newBinary = asciiToBinary(value, paddingMode);
    setBinaryData(newBinary);
  };

  // Handle padding mode change
  const handlePaddingChange = (newPadding: PaddingMode) => {
    setPaddingMode(newPadding);
    // Re-apply current ASCII value with new padding
    if (keyFormat === 'ascii') {
      const newBinary = asciiToBinary(asciiValue, newPadding);
      setBinaryData(newBinary);
    }
  };

  const isValidKey = binaryData.some(b => b !== 0); // At least one non-zero byte

  return (
    <div className="advanced-key-entry">
      <div className="key-entry-header">
        <h4>Advanced Key Entry</h4>
        <div className="format-selector">
          <label>Format:</label>
          <select
            value={keyFormat}
            onChange={e => handleFormatChange(e.target.value as KeyFormat)}
            disabled={disabled}
          >
            <option value="hex">Hexadecimal</option>
            <option value="ascii">ASCII/Unicode</option>
          </select>
        </div>
      </div>

      <div className="key-input-section">
        {keyFormat === 'hex' ? (
          <div className="hex-input">
            <label htmlFor="hex-field">Hexadecimal (64 characters):</label>
            <input
              id="hex-field"
              type="text"
              value={hexValue}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="Enter 64 character hex string..."
              className="hex-field"
              disabled={disabled}
              maxLength={64}
            />
            <small className="help-text">
              Enter a 256-bit private key as hexadecimal (0-9, a-f)
            </small>
          </div>
        ) : (
          <div className="ascii-input">
            <div className="ascii-header">
              <label htmlFor="ascii-field">ASCII/Unicode Text:</label>
              <div className="padding-selector">
                <label>Padding:</label>
                <select
                  value={paddingMode}
                  onChange={e => handlePaddingChange(e.target.value as PaddingMode)}
                  disabled={disabled}
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
              className="ascii-field"
              disabled={disabled}
              rows={3}
              maxLength={32}
            />
            <small className="help-text">
              Text will be UTF-8 encoded to bytes. Max 32 characters/bytes.
            </small>
          </div>
        )}
      </div>

      <div className="key-preview-section">
        <div className="preview-tabs">
          <button
            className={`preview-tab ${keyFormat === 'hex' ? 'active' : ''}`}
            onClick={() => setKeyFormat('hex')}
            disabled={disabled}
          >
            Hex View
          </button>
          <button
            className={`preview-tab ${keyFormat === 'ascii' ? 'active' : ''}`}
            onClick={() => setKeyFormat('ascii')}
            disabled={disabled}
          >
            ASCII View
          </button>
        </div>

        <div className="preview-content">
          <div className="preview-display">
            <label>Binary Data Preview:</label>
            <div className="binary-preview">
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
      </div>

      <div className="key-status">
        <span className={`status-indicator ${isValidKey ? 'valid' : 'invalid'}`}>
          {isValidKey ? '✓ Valid key data' : '⚠ Empty key'}
        </span>
      </div>
    </div>
  );
};

export default AdvancedKeyEntry;
