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

    // Always show generator point G and public key
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
      label: 'PubKey',
      color: '#ef4444', // red
      description: 'Challenge public key',
    });

    // Show half point after first guess
    if (guessCount >= 1) {
      points.push({
        id: 'half',
        x: 50,
        y: 45,
        label: 'PubKey/2',
        color: '#f59e0b', // amber
        description: 'Half of public key',
      });
    }

    // Show double point after second guess
    if (guessCount >= 2) {
      points.push({
        id: 'double',
        x: 85,
        y: 25,
        label: 'PubKey×2',
        color: '#10b981', // emerald
        description: 'Double of public key',
      });
    }

    // Show (pubkey - G) / 2 point after third guess
    if (guessCount >= 3) {
      points.push({
        id: 'formula',
        x: 40,
        y: 65,
        label: '(PubKey-G)/2',
        color: '#8b5cf6', // violet
        description: '(Public key minus generator) divided by 2',
      });
    }

    // Show negated points after fourth guess
    if (guessCount >= 4) {
      points.push({
        id: 'neg-generator',
        x: 30,
        y: 60,
        label: '-G',
        color: '#64748b', // slate
        description: 'Negated generator point',
      });

      points.push({
        id: 'neg-pubkey',
        x: 70,
        y: 65,
        label: '-PubKey',
        color: '#dc2626', // red (darker)
        description: 'Negated challenge public key',
      });

      points.push({
        id: 'neg-half',
        x: 50,
        y: 55,
        label: '-PubKey/2',
        color: '#d97706', // amber (darker)
        description: 'Negated half of public key',
      });

      points.push({
        id: 'neg-double',
        x: 85,
        y: 75,
        label: '-PubKey×2',
        color: '#059669', // emerald (darker)
        description: 'Negated double of public key',
      });

      points.push({
        id: 'neg-formula',
        x: 40,
        y: 35,
        label: '-(PubKey-G)/2',
        color: '#7c3aed', // violet (darker)
        description: 'Negated (public key minus generator) divided by 2',
      });
    }

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

    // Add negated guess points (if step 4+ unlocked)
    if (guessCount >= 4) {
      guesses.forEach((guess, index) => {
        points.push({
          id: `neg-guess-${index}`,
          x: 20 + ((index * 10) % 60), // Same x position as positive
          y: 70 + ((index * 7) % 20), // Below positive guesses
          label: `-G${index + 1}`,
          color: guess.result === 'correct' ? '#16a34a' : '#4b5563', // darker green if correct, darker gray if not
          description: `Negated guess ${index + 1}`,
        });
      });
    }

    return points;
  };

  const points = getVisiblePoints();

  return (
    <div className="challenge-display">
      {/* Header with title */}
      <div className="challenge-header">
        <div className="challenge-title">
          <h2>Curve Quest #{Math.floor(Math.random() * 1000)}</h2>
          <p>Find the private key for this Bitcoin address</p>
        </div>
      </div>

      {/* ECC Graph */}
      <div className="ecc-graph-container">
        <div className="graph-header">
          <h3>secp256k1 Elliptic Curve</h3>
          <p>y² = x³ + 7 (mod p)</p>
        </div>

        <div className="ecc-graph">
          {/* Coordinate system */}
          <div className="graph-axes">
            <div className="x-axis"></div>
            <div className="y-axis"></div>
            <div className="axis-label x-label">x</div>
            <div className="axis-label y-label">y</div>
          </div>

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
              <span>Challenge Public Key</span>
            </div>
            {guessCount >= 1 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
                <span>Half Point</span>
              </div>
            )}
            {guessCount >= 2 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#10b981' }}></div>
                <span>Double Point</span>
              </div>
            )}
            {guessCount >= 3 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></div>
                <span>(PubKey-G)/2</span>
              </div>
            )}
            {guessCount >= 4 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#64748b' }}></div>
                <span>Negated Points</span>
              </div>
            )}
            {guesses.length > 0 && (
              <div className="legend-item">
                <div className="legend-dot" style={{ backgroundColor: '#6b7280' }}></div>
                <span>Your Guesses{guessCount >= 4 ? ' & Negated' : ''}</span>
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
