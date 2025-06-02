import React, { useState, useEffect } from 'react';
import type { Challenge } from '../types/api';
import { challengeApi } from '../services/api';
import { storageUtils } from '../utils/storage';
import ECCPlayground from '../components/ECCPlayground';
import PracticeMode from '../components/PracticeMode';
import ChallengeInfo from '../components/ChallengeInfo';
import ThemeToggle from '../components/ThemeToggle';
import './ECCGamePage.css';

const ECCGamePage: React.FC = () => {
  const [gameMode, setGameMode] = useState<'daily' | 'practice'>('daily');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    if (gameMode === 'daily') {
      loadDailyChallenge();
    }
  }, [gameMode]);

  const loadDailyChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const dailyChallenge = await challengeApi.getDailyChallenge();
      setChallenge(dailyChallenge);

      // Check if already won today
      const wonToday = storageUtils.hasWonToday(dailyChallenge.uuid);
      setHasWon(wonToday);
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      setError("Failed to load today's challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDailySolve = async (_privateKey: string) => {
    if (!challenge) return;

    try {
      // In a real implementation, this would submit to the backend
      // For now, we'll just mark as won locally
      setHasWon(true);
      storageUtils.markWonToday(challenge.uuid);
      alert("🎉 Congratulations! You solved today's challenge!");
    } catch (error) {
      console.error('Failed to submit solution:', error);
      alert('Failed to submit solution. Please try again.');
    }
  };

  if (gameMode === 'practice') {
    return (
      <div className="ecc-game-page">
        <header className="game-header">
          <div className="header-content">
            <h1>ECC Crypto Playground</h1>
            <div className="mode-controls">
              <div className="mode-selector">
                <button
                  className={`mode-button ${gameMode === 'daily' ? 'active' : ''}`}
                  onClick={() => setGameMode('daily')}
                >
                  Daily Challenge
                </button>
                <button
                  className={`mode-button ${gameMode === 'practice' ? 'active' : ''}`}
                  onClick={() => setGameMode('practice')}
                >
                  Practice Mode
                </button>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="game-main">
          <PracticeMode />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ecc-game-page">
        <header className="game-header">
          <div className="header-content">
            <h1>ECC Crypto Playground</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="game-main">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading today's challenge...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="ecc-game-page">
        <header className="game-header">
          <div className="header-content">
            <h1>ECC Crypto Playground</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="game-main">
          <div className="error-state">
            <h2>Unable to load challenge</h2>
            <p>{error || 'Something went wrong. Please try again.'}</p>
            <button onClick={loadDailyChallenge} className="retry-button">
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ecc-game-page">
      <header className="game-header">
        <div className="header-content">
          <h1>ECC Crypto Playground</h1>
          <div className="mode-controls">
            <div className="mode-selector">
              <button
                className={`mode-button ${gameMode === 'daily' ? 'active' : ''}`}
                onClick={() => setGameMode('daily')}
              >
                Daily Challenge
              </button>
              <button
                className={`mode-button ${gameMode === 'practice' ? 'active' : ''}`}
                onClick={() => setGameMode('practice')}
              >
                Practice Mode
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
      </header>

      <main className="game-main">
        <div className="challenge-info-row">
          <div className="challenge-info-card">
            <ChallengeInfo challenge={challenge} />

            {hasWon && (
              <div className="victory-banner">
                <div className="victory-icon">🎉</div>
                <div className="victory-text">
                  <strong>Challenge Completed!</strong>
                  <p>You've solved today's challenge. Come back tomorrow for a new one!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="playground-container">
          <ECCPlayground challenge={challenge} onSolve={handleDailySolve} isPracticeMode={false} />
        </div>
      </main>
    </div>
  );
};

export default ECCGamePage;
