import React, { useState, useEffect } from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import { getPublicKeyFormats, getAllKeyFormats } from '../utils/crypto';
import GuessForm from './GuessForm';
import './GuessSection.css';

interface GuesseSectionProps {
  challenge: Challenge;
  guesses: GuessResponse[];
  onSubmit: (privateKey: string) => Promise<void>;
  isLoading: boolean;
  hasWon: boolean;
  remainingGuesses: number;
}

interface KeyFormat {
  compressed: string;
  uncompressed: string;
  coordinates: { x: string; y: string };
  p2pkh?: string;
}

type DataType = 'challenge' | 'guess';

interface DataEntry {
  type: DataType;
  label: string;
  keyData: KeyFormat;
  explorerLink?: string;
}

const GuessSection: React.FC<GuesseSectionProps> = ({
  challenge,
  guesses,
  onSubmit,
  isLoading,
  hasWon,
  remainingGuesses,
}) => {
  const [dataFormats, setDataFormats] = useState<
    Record<string, 'p2pkh' | 'compressed' | 'uncompressed' | 'coordinates'>
  >({});
  const [guessKeyFormats, setGuessKeyFormats] = useState<Record<string, KeyFormat>>({});

  // Generate P2PKH addresses for all guesses
  useEffect(() => {
    const generateGuessFormats = async () => {
      const newFormats: Record<string, KeyFormat> = {};

      for (let i = 0; i < guesses.length; i++) {
        const guess = guesses[i];
        const guessId = `guess-${i}`;

        if (!guess.public_key) {
          newFormats[guessId] = {
            compressed: 'N/A',
            uncompressed: 'N/A',
            coordinates: { x: 'N/A', y: 'N/A' },
            p2pkh: 'N/A',
          };
          continue;
        }

        try {
          const allFormats = await getAllKeyFormats(guess.public_key);
          newFormats[guessId] = allFormats;
        } catch (error) {
          console.error(`Error generating formats for guess ${i + 1}:`, error);
          const basicFormats = getPublicKeyFormats(guess.public_key);
          newFormats[guessId] = {
            ...basicFormats,
            p2pkh: 'Error generating address',
          };
        }
      }

      setGuessKeyFormats(newFormats);
    };

    if (guesses.length > 0) {
      generateGuessFormats();
    }
  }, [guesses]);

  // Get real key formats using crypto utilities
  const getChallengeKeyFormats = (): KeyFormat => {
    try {
      const basicFormats = getPublicKeyFormats(challenge.public_key);
      return {
        ...basicFormats,
        p2pkh: challenge.p2pkh_address, // Use the actual address from challenge
      };
    } catch (error) {
      console.error('Error parsing challenge public key:', error);
      // Fallback to mock data if parsing fails
      return {
        compressed: challenge.public_key,
        uncompressed: 'Error parsing key',
        coordinates: { x: 'Error', y: 'Error' },
        p2pkh: challenge.p2pkh_address,
      };
    }
  };

  // Create data entries list
  const getDataEntries = (): DataEntry[] => {
    const entries: DataEntry[] = [];

    // Challenge entry (always show, starts with address format)
    entries.push({
      type: 'challenge',
      label: 'Challenge',
      keyData: getChallengeKeyFormats(),
      explorerLink: challenge.explorer_link,
    });

    // Add guess entries
    guesses.forEach((guess, index) => {
      const guessId = `guess-${index}`;
      const keyData = guessKeyFormats[guessId] || {
        compressed: 'Loading...',
        uncompressed: 'Loading...',
        coordinates: { x: 'Loading...', y: 'Loading...' },
        p2pkh: 'Loading...',
      };

      entries.push({
        type: 'guess',
        label: `Guess ${index + 1}${guess.result === 'correct' ? ' ✓' : ''}`,
        keyData,
      });
    });

    return entries;
  };

  const formatEntryData = (entry: DataEntry, entryId: string) => {
    const format = dataFormats[entryId] || 'p2pkh';
    switch (format) {
      case 'p2pkh':
        return entry.keyData.p2pkh || '';
      case 'compressed':
        return entry.keyData.compressed;
      case 'uncompressed':
        return entry.keyData.uncompressed;
      case 'coordinates':
        return `x: ${entry.keyData.coordinates.x}\ny: ${entry.keyData.coordinates.y}`;
      default:
        return entry.keyData.p2pkh || '';
    }
  };

  const cycleDataFormat = (entryId: string) => {
    const currentFormat = dataFormats[entryId] || 'p2pkh';
    const formats: ('p2pkh' | 'compressed' | 'uncompressed' | 'coordinates')[] = [
      'p2pkh',
      'compressed',
      'uncompressed',
      'coordinates',
    ];
    const currentIndex = formats.indexOf(currentFormat);
    const nextIndex = (currentIndex + 1) % formats.length;

    setDataFormats(prev => ({
      ...prev,
      [entryId]: formats[nextIndex],
    }));
  };

  const dataEntries = getDataEntries();

  return (
    <div className="guess-section">
      <div className="security-warning">
        <span className="warning-icon">⚠️</span>
        <div className="warning-text">
          <strong>Security Warning:</strong> NEVER enter your wallet's private keys into this or any
          untrusted website. Only generate new keys for this game.
        </div>
      </div>

      <div className="guess-section-header">
        <h3>Cryptographic Data & Guesses ({guesses.length}/6)</h3>
        {!hasWon && remainingGuesses > 0 && (
          <span className={`remaining-guesses ${remainingGuesses <= 2 ? 'warning' : ''}`}>
            {remainingGuesses} remaining
          </span>
        )}
      </div>

      <div className="data-list">
        {dataEntries.map((entry, index) => {
          const entryId = `${entry.type}-${index}`;
          const currentFormat = dataFormats[entryId] || 'p2pkh';
          const formattedData = formatEntryData(entry, entryId);

          // Calculate gradient for guesses using same colors as challenge card
          const getGuessGradient = () => {
            if (entry.type !== 'guess') return undefined;

            const guessNumber = index; // 1, 2, 3, 4, 5, 6
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

            if (isDark) {
              // Dark theme: Challenge uses #1e293b to #0f172a
              // Create variations by adjusting these base colors
              const intensity = Math.min(1, guessNumber * 0.15); // 0.15 to 0.9

              // Interpolate between challenge colors and more intense versions
              const r1 = Math.round(30 + intensity * 15); // 30-45
              const g1 = Math.round(41 + intensity * 20); // 41-61
              const b1 = Math.round(59 + intensity * 25); // 59-84

              const r2 = Math.round(15 + intensity * 10); // 15-25
              const g2 = Math.round(23 + intensity * 15); // 23-38
              const b2 = Math.round(42 + intensity * 20); // 42-62

              return `linear-gradient(135deg, rgb(${r1}, ${g1}, ${b1}), rgb(${r2}, ${g2}, ${b2}))`;
            } else {
              // Light theme: Challenge uses #ffffff to #f8fafc
              // Create variations by adjusting these base colors
              const intensity = Math.min(1, guessNumber * 0.15); // 0.15 to 0.9

              // Start from white and get progressively more tinted
              const color1r = Math.round(255 - intensity * 5); // 255 down to 250
              const color1g = Math.round(255 - intensity * 5); // 255 down to 250
              const color1b = Math.round(255 - intensity * 5); // 255 down to 250

              const color2r = Math.round(248 - intensity * 8); // 248 down to 240
              const color2g = Math.round(250 - intensity * 6); // 250 down to 244
              const color2b = Math.round(252 - intensity * 4); // 252 down to 248

              return `linear-gradient(135deg, rgb(${color1r}, ${color1g}, ${color1b}), rgb(${color2r}, ${color2g}, ${color2b}))`;
            }
          };

          return (
            <div
              key={entryId}
              className={`data-entry ${entry.type}`}
              style={
                entry.type === 'guess'
                  ? ({
                      background: getGuessGradient(),
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <div className="data-entry-header">
                <div className="data-entry-label">{entry.label}</div>
                <button
                  className="format-toggle"
                  onClick={() => cycleDataFormat(entryId)}
                  title="Click to cycle through formats"
                >
                  {currentFormat === 'p2pkh' && 'P2PKH Address'}
                  {currentFormat === 'compressed' && 'Compressed Key'}
                  {currentFormat === 'uncompressed' && 'Uncompressed Key'}
                  {currentFormat === 'coordinates' && 'Coordinates'}↻
                </button>
              </div>

              <div className="data-entry-content">
                <div className="data-row">
                  <div className="data-type-label">
                    {currentFormat === 'p2pkh' && 'ADDRESS'}
                    {currentFormat === 'compressed' && 'COMPRESSED'}
                    {currentFormat === 'uncompressed' && 'UNCOMPRESSED'}
                    {currentFormat === 'coordinates' && 'COORDINATES'}
                  </div>
                  <div className="data-value-container">
                    <code>{formattedData}</code>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Input form for next guess or victory message */}
        {hasWon ? (
          <div className="victory-message">
            <h2>🎉 Congratulations!</h2>
            <p>You successfully found the private key! Come back tomorrow for a new challenge.</p>
          </div>
        ) : remainingGuesses > 0 ? (
          <div className="guess-input-entry">
            <div className="data-entry-header">
              <div className="data-entry-label">Guess #{guesses.length + 1}</div>
            </div>
            <div className="data-entry-content">
              <div className="data-row">
                <div className="data-type-label">PRIVATE KEY</div>
                <div className="data-value-container">
                  <div className="guess-form-container">
                    <GuessForm
                      onSubmit={onSubmit}
                      isLoading={isLoading}
                      remainingGuesses={remainingGuesses}
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="game-over-message">
            <h3>Game Over</h3>
            <p>You've used all your guesses. Come back tomorrow for a new challenge!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuessSection;
