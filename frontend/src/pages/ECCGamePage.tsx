import React from 'react';
import ChallengeInfo from '../components/ChallengeInfo';
import ECCPlayground from '../components/ECCPlayground';
import PracticeMode from '../components/PracticeMode';
import ThemeToggle from '../components/ThemeToggle';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import './ECCGamePage.css';

const ECCGamePage: React.FC = () => {
  const {
    gameMode,
    challenge,
    loading,
    error,
    hasWon,
    setGameMode,
    loadDailyChallenge,
    handleSolve,
    clearError,
  } = useGameStateRedux();

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
            <button onClick={clearError}>×</button>
          </div>
        )}
      </header>

      <main className="game-main">
        <div className="challenge-info-row">
          <div className="challenge-info-card">
            <ChallengeInfo challenge={challenge} />
          </div>
        </div>

        <div className="playground-container">
          <ECCPlayground challenge={challenge} onSolve={handleSolve} isPracticeMode={false} />
        </div>
      </main>
    </div>
  );
};

export default ECCGamePage;
