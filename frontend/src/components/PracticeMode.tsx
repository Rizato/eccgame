import React, { useState, useEffect } from 'react';
import ECCPlayground from './ECCPlayground';
import {
  generateRandomScalar,
  pointMultiply,
  getGeneratorPoint,
  pointToPublicKey,
  bigintToHex,
} from '../utils/ecc';
import type { Challenge } from '../types/api';
import './PracticeMode.css';

const PracticeMode: React.FC = () => {
  const [practicePrivateKey, setPracticePrivateKey] = useState<string>('');
  const [practiceChallenge, setPracticeChallenge] = useState<Challenge | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Generate a new practice challenge
  const generatePracticeChallenge = () => {
    let privateKey: bigint;

    switch (difficulty) {
      case 'easy':
        // Small private key (1-100)
        privateKey = BigInt(Math.floor(Math.random() * 100) + 1);
        break;
      case 'medium':
        // Medium private key (up to 2^20)
        privateKey = BigInt(Math.floor(Math.random() * 1048576) + 1);
        break;
      case 'hard':
        // Large private key (full range)
        privateKey = generateRandomScalar();
        break;
    }

    const privateKeyHex = bigintToHex(privateKey);
    const generatorPoint = getGeneratorPoint();
    const publicKeyPoint = pointMultiply(privateKey, generatorPoint);
    const publicKeyHex = pointToPublicKey(publicKeyPoint);

    setPracticePrivateKey(privateKeyHex);
    setPracticeChallenge({
      uuid: 'practice-challenge',
      public_key: publicKeyHex,
      p2pkh_address: 'practice-address',
      created_at: new Date().toISOString(),
      metadata: [],
      explorer_link: '',
      active: true,
      active_date: new Date().toISOString(),
    });
    setShowSolution(false);
  };

  // Initialize with first challenge
  useEffect(() => {
    generatePracticeChallenge();
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSolve = async (submittedPrivateKey: string) => {
    if (submittedPrivateKey === practicePrivateKey) {
      alert('🎉 Congratulations! You solved the practice challenge!');
      setShowSolution(true);
    } else {
      alert("❌ That's not quite right. Keep trying!");
    }
  };

  if (!practiceChallenge) {
    return (
      <div className="practice-mode">
        <div className="loading">Generating practice challenge...</div>
      </div>
    );
  }

  return (
    <div className="practice-mode">
      <div className="challenge-info-row">
        <div className="challenge-info-card">
          <h3>Practice Target</h3>

          {/* Challenge Controls */}
          <div className="challenge-controls">
            <div className="difficulty-selector">
              <label>Difficulty:</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="difficulty-select"
              >
                <option value="easy">Easy (1-100)</option>
                <option value="medium">Medium (1-1M)</option>
                <option value="hard">Hard (Full Range)</option>
              </select>
            </div>

            <button onClick={generatePracticeChallenge} className="new-challenge-button">
              New Challenge
            </button>
          </div>

          <div className="target-info">
            <div className="target-item">
              <span className="target-label">Goal:</span>
              <span className="target-value">Reach generator point G</span>
            </div>
            <div className="target-item">
              <span className="target-label">Current Difficulty:</span>
              <span className="target-value">
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
            </div>
            {practicePrivateKey && (
              <div className="target-item">
                <span className="target-label">Key Range:</span>
                <span className="target-value">
                  {difficulty === 'easy'
                    ? '1-100'
                    : difficulty === 'medium'
                      ? '1-1M'
                      : 'Full Range'}
                </span>
              </div>
            )}
          </div>

          <div className="solution-controls">
            <button
              onClick={() => setShowSolution(!showSolution)}
              className="reveal-solution-button"
            >
              {showSolution ? 'Hide' : 'Show'} Solution
            </button>
          </div>

          {showSolution && (
            <div className="solution-panel">
              <h4>Solution</h4>
              <div className="solution-content">
                <div className="solution-item">
                  <span className="solution-label">Private Key:</span>
                  <span className="solution-value">{practicePrivateKey}</span>
                </div>
                <div className="solution-item">
                  <span className="solution-label">Decimal:</span>
                  <span className="solution-value">
                    {BigInt('0x' + practicePrivateKey).toString()}
                  </span>
                </div>
                <div className="solution-explanation">
                  The private key is the scalar that when multiplied by G gives the public key.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground
          challenge={practiceChallenge}
          onSolve={handleSolve}
          isPracticeMode={true}
          practicePrivateKey={practicePrivateKey}
        />
      </div>
    </div>
  );
};

export default PracticeMode;
