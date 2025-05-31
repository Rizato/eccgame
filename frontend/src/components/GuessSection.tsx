import React, { useState, useEffect } from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import { getPublicKeyFormats, getAllKeyFormats } from '../utils/crypto';
import { Modal } from './Modal';
import './GuessSection.css';

interface GuesseSectionProps {
  challenge: Challenge;
  guesses: GuessResponse[];
  hasWon: boolean;
  remainingGuesses: number;
}

interface KeyFormat {
  compressed: string;
  uncompressed: string;
  coordinates: { x: string; y: string };
  p2pkh?: string;
}

interface GuessData {
  guessNumber: number;
  address: string;
  keyData?: KeyFormat;
  result?: 'correct' | 'incorrect';
  difference?: string;
}

const GuessSection: React.FC<GuesseSectionProps> = ({
  challenge,
  guesses,
  hasWon,
  remainingGuesses,
}) => {
  const [selectedGuess, setSelectedGuess] = useState<GuessData | null>(null);
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

  // Create guess data with pre-populated templates
  const getGuessData = (): GuessData[] => {
    const guessData: GuessData[] = [];

    // Reverse guesses array to show chronological order (oldest first)
    const chronologicalGuesses = [...guesses].reverse();

    // Add actual guesses in chronological order
    chronologicalGuesses.forEach((guess, index) => {
      const guessId = `guess-${guesses.length - 1 - index}`; // Map back to original index for keyData
      const keyData = guessKeyFormats[guessId];

      guessData.push({
        guessNumber: index + 1,
        address: keyData?.p2pkh || 'Loading...',
        keyData,
        result: guess.result,
        difference: 'Calculate difference',
      });
    });

    // Add empty templates for remaining guesses
    const remainingSlots = 6 - guesses.length;
    for (let i = 0; i < remainingSlots; i++) {
      guessData.push({
        guessNumber: guesses.length + i + 1,
        address: '—',
      });
    }

    return guessData;
  };

  const handleGuessClick = (guessData: GuessData) => {
    if (guessData.keyData) {
      setSelectedGuess(guessData);
    }
  };

  const guessData = getGuessData();

  return (
    <div className="guess-section">
      <div className="guess-list">
        {guessData.map(guess => {
          return (
            <div
              key={guess.guessNumber}
              className={`guess-item ${guess.result || ''} ${guess.keyData ? 'clickable' : ''}`}
              onClick={() => handleGuessClick(guess)}
            >
              <div className="guess-number">#{guess.guessNumber}</div>
              <div className="address-display">{guess.address}</div>
              <div className="guess-result">
                {guess.result === 'correct' && <span className="result-correct">✓</span>}
                {guess.result === 'incorrect' && <span className="result-incorrect">✗</span>}
                {!guess.result && guess.keyData && <span className="result-pending">⏳</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!selectedGuess}
        onClose={() => setSelectedGuess(null)}
        title={selectedGuess ? `Guess #${selectedGuess.guessNumber} Details` : ''}
        pointData={
          selectedGuess?.keyData
            ? {
                address: selectedGuess.address,
                compressedKey: selectedGuess.keyData.compressed,
                xCoordinate: selectedGuess.keyData.coordinates.x,
                yCoordinate: selectedGuess.keyData.coordinates.y,
                distanceToTarget: 'Point difference calculation would go here',
              }
            : undefined
        }
      />
    </div>
  );
};

export default GuessSection;
