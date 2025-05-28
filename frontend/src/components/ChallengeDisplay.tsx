import React from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import './ChallengeDisplay.css';

interface ChallengeDisplayProps {
  challenge: Challenge;
  guesses: GuessResponse[];
}

const ChallengeDisplay: React.FC<ChallengeDisplayProps> = ({ challenge, guesses }) => {
  const guessCount = guesses.length;

  const getVisiblePoints = () => {
    const points = [];

    // Always show generator point G and challenge public key
    points.push({
      id: 'generator',
      x: 30,
      y: 40,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
    });

    points.push({
      id: 'pubkey',
      x: 70,
      y: 35,
      label: 'Challenge',
      color: '#ef4444', // red
      description: 'Challenge public key',
    });

    // Add guess points
    guesses.forEach((guess, index) => {
      points.push({
        id: `guess-${index}`,
        x: 20 + ((index * 10) % 60), // Spread guesses across
        y: 30 + ((index * 7) % 40),
        label: `G${index + 1}`,
        color: guess.result === 'correct' ? '#22c55e' : '#6b7280', // green if correct, gray if not
        description: `Guess ${index + 1}`,
      });
    });

    return points;
  };

  const points = getVisiblePoints();

  return (
    <div className="challenge-display">
      {/* Header with title */}
      <div className="challenge-header">
        <div className="challenge-title">
          <h2>Daily Challenge Wallet: {challenge.p2pkh_address}</h2>
          <p>
            Try your luck at the impossible, derving the scalar private key from a bitcoin wallet
            public key
          </p>
        </div>
        {challenge.explorer_link && (
          <a
            href={challenge.explorer_link}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-button header-explorer"
            title="View on blockchain explorer"
          >
            View Explorer
          </a>
        )}
      </div>

      {/* ECC Graph */}
      <div className="ecc-graph-container">
        <div className="graph-header">
          <h3>secp256k1 Elliptic Curve</h3>
          <p>y² = x³ + 7 (mod p)</p>
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

        {/* Legend */}
        <div className="graph-legend">
          <div className="legend-grid">
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>Generator Point (G)</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Challenge Public Point</span>
            </div>
            {guesses.length > 0 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div>
                <span>Your Guesses</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playpen unlocks after 5 guesses */}
      {guessCount >= 5 && (
        <div className="playpen-access">
          <div className="playpen-header">
            <h4>🛠️ Interactive Playpen Unlocked!</h4>
            <p>Explore elliptic curve operations interactively</p>
          </div>
          <button className="playpen-button">Open Playpen →</button>
        </div>
      )}
    </div>
  );
};

export default ChallengeDisplay;
