import React from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import './ChallengeDisplay.css';

interface ChallengeDisplayProps {
  challenge: Challenge;
  guesses: GuessResponse[];
}

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({ challenge, guesses }) => {
  const guessCount = guesses.length;

  // Extract x,y coordinates from a compressed public key (33 bytes, starts with 02 or 03)
  const extractCoordinatesFromPubKey = (pubKeyHex: string) => {
    try {
      // Remove any 0x prefix and ensure it's 66 characters (33 bytes)
      const cleanHex = pubKeyHex.replace(/^0x/, '');
      if (cleanHex.length !== 66) return null;

      // Extract x coordinate (32 bytes after the prefix byte)
      const xHex = cleanHex.slice(2, 66);
      const x = BigInt('0x' + xHex);

      // For visualization, we'll use a simple hash of the coordinates to get y
      // This isn't the actual y coordinate but gives us consistent positioning
      const hashInput = xHex;
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash + hashInput.charCodeAt(i)) & 0xffffffff;
      }
      const y = Math.abs(hash);

      return { x, y: BigInt(y) };
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return null;
    }
  };

  // Map large coordinate values to screen percentage (0-100)
  const mapToScreenCoordinate = (coord: bigint, isY: boolean = false) => {
    // Use the last 32 bits for better distribution
    const lastBits = Number(coord & 0xffffffffn);
    const percentage = (lastBits % 80) + 10; // Keep between 10-90% to avoid edges
    return isY ? percentage : percentage;
  };

  const getVisiblePoints = () => {
    const points = [];

    // Extract challenge coordinates
    const challengeCoords = extractCoordinatesFromPubKey(challenge.public_key);
    const challengeX = challengeCoords ? mapToScreenCoordinate(challengeCoords.x) : 70;
    const challengeY = challengeCoords ? mapToScreenCoordinate(challengeCoords.y, true) : 35;

    // Always show generator point G (fixed position)
    points.push({
      id: 'generator',
      x: 30,
      y: 40,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
    });

    // Challenge public key at actual coordinates
    points.push({
      id: 'pubkey',
      x: challengeX,
      y: challengeY,
      label: 'Challenge',
      color: '#ef4444', // red
      description: 'Challenge public key',
    });

    // Add guess points at their actual coordinates
    guesses.forEach((guess, index) => {
      const guessCoords = extractCoordinatesFromPubKey(guess.public_key);
      const guessX = guessCoords ? mapToScreenCoordinate(guessCoords.x) : 20 + ((index * 10) % 60);
      const guessY = guessCoords
        ? mapToScreenCoordinate(guessCoords.y, true)
        : 30 + ((index * 7) % 40);

      // Since guesses array is newest-first, reverse the numbering for chronological order
      const guessNumber = guesses.length - index;

      points.push({
        id: `guess-${index}`,
        x: guessX,
        y: guessY,
        label: `Guess ${guessNumber}`,
        color: guess.result === 'correct' ? '#22c55e' : '#6b7280', // green if correct, gray if not
        description: `Guess ${guessNumber}`,
      });
    });

    return points;
  };

  const points = getVisiblePoints();

  return (
    <div className="challenge-display">
      <div className="graph-content">
        <div className="formula">y² = x³ + 7 (mod p)</div>
        <div className="legend-grid">
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>G</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
            <span>Challenge</span>
          </div>
          {guesses.length > 0 && (
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div>
              <span>Guesses</span>
            </div>
          )}
        </div>
      </div>

      <div className="ecc-graph">
        {/* Graph border */}
        <div className="graph-border"></div>

        {/* Coordinate system */}
        <div className="graph-axes">
          <div className="axis-label x-label">x</div>
          <div className="axis-label y-label">y</div>
        </div>

        {/* Vertical dashed line at G */}
        <div className="generator-line"></div>

        {/* Curve visualization */}
        <div className="curve-line"></div>

        {/* Plot points */}
        {points.map(point => (
          <div
            key={point.id}
            className={`ecc-point ${point.id}`}
            style={
              {
                left: `${point.x}%`,
                top: `${point.y}%`,
                '--point-color': point.color,
              } as React.CSSProperties
            }
            title={point.description}
          >
            <div className="point-dot"></div>
            <div className="point-label">{point.label}</div>
          </div>
        ))}

        {/* Graph range indicators */}
        <div className="range-indicator bottom-left">0</div>
        <div className="range-indicator bottom-right">p</div>
        <div className="range-indicator top-left">p</div>
      </div>
    </div>
  );
};

export default ChallengeDisplay;
