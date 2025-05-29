import React, { useState, useEffect } from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import { challengeApi } from '../services/api';
import { generateGuessFromPrivateKey } from '../utils/crypto';
import { storageUtils } from '../utils/storage';
import ChallengeDisplay from '../components/ChallengeDisplay';
import ChallengeInfo from '../components/ChallengeInfo';
import GuessSection from '../components/GuessSection';
import GuessForm from '../components/GuessForm';
import ThemeToggle from '../components/ThemeToggle';
import './GamePage.css';

const MAX_GUESSES = 6; // Should match backend setting

const GamePage: React.FC = () => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'graph' | 'guesses'>('info');

  useEffect(() => {
    loadDailyChallenge();
  }, []);

  // Load guess history when challenge is loaded
  useEffect(() => {
    if (challenge) {
      const storedGuesses = storageUtils.loadGuessHistory(challenge.uuid);
      setGuesses(storedGuesses);
    }
  }, [challenge]);

  const loadDailyChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      const dailyChallenge = await challengeApi.getDailyChallenge();
      setChallenge(dailyChallenge);
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      setError("Failed to load today's challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuessSubmit = async (privateKey: string) => {
    if (!challenge) return;

    try {
      setSubmitting(true);
      setError(null);

      // Generate public key and signature from private key
      const guess = await generateGuessFromPrivateKey(privateKey, challenge.uuid);

      const result = await challengeApi.submitGuess(challenge.uuid, guess);

      // Add the new guess to the beginning of the list (most recent first)
      const updatedGuesses = [result, ...guesses];
      setGuesses(updatedGuesses);

      // Save to local storage
      storageUtils.saveGuessHistory(challenge.uuid, updatedGuesses);

      // Show success message if correct
      if (result.result === 'correct') {
        alert('🎉 Congratulations! You found the correct private key!');
      }
    } catch (err: any) {
      console.error('Failed to submit guess:', err);

      // Handle specific error cases
      if (err.response?.status === 403) {
        setError('You have reached the maximum number of guesses for today. Try again tomorrow!');
      } else if (err.response?.status === 400) {
        setError('Invalid private key or cryptographic error. Please check your input.');
      } else if (err.message?.includes('Invalid private key')) {
        setError('Invalid private key format or value.');
      } else {
        setError('Failed to submit guess. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const remainingGuesses = MAX_GUESSES - guesses.length;
  const hasWon = guesses.some(guess => guess.result === 'correct');

  if (loading) {
    return (
      <div className="game-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading today's challenge...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="game-page">
        <div className="error-state">
          <h2>Unable to load challenge</h2>
          <p>{error || 'Something went wrong. Please try again.'}</p>
          <button onClick={loadDailyChallenge} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="header-content">
          <div className="challenge-info">
            <h1>Curve Quest</h1>
          </div>
          <ThemeToggle />
        </div>
        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}
      </header>

      <div className="game-container">
        <div className="content-section">
          {/* Mobile: Tabbed content */}
          <div className="tab-content mobile-only">
            {/* Tab header - clickable on mobile, headings on desktop */}
            <div className="tab-header">
              <button
                className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                Challenge
              </button>
              <button
                className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
                onClick={() => setActiveTab('graph')}
              >
                Graph
              </button>
              <button
                className={`tab-button ${activeTab === 'guesses' ? 'active' : ''}`}
                onClick={() => setActiveTab('guesses')}
              >
                Guesses ({guesses.length}/6)
              </button>
            </div>
            <div>
              {activeTab === 'info' ? (
                <ChallengeInfo challenge={challenge} />
              ) : activeTab === 'graph' ? (
                <ChallengeDisplay challenge={challenge} guesses={guesses} />
              ) : (
                <GuessSection
                  challenge={challenge}
                  guesses={guesses}
                  remainingGuesses={remainingGuesses}
                  hasWon={hasWon}
                />
              )}
            </div>
          </div>

          {/* Desktop: Three column layout */}
          <div className="three-column desktop-only">
            <div className="challenge-panel">
              <div className="panel-header">
                <h3>Challenge Info</h3>
              </div>
              <ChallengeInfo challenge={challenge} />
            </div>
            <div className="graph-panel">
              <div className="panel-header">
                <h3>secp256k1 Elliptic Curve</h3>
              </div>
              <ChallengeDisplay challenge={challenge} guesses={guesses} />
            </div>
            <div className="guesses-panel">
              <div className="panel-header">
                <h3>Guesses ({guesses.length}/6)</h3>
              </div>
              <GuessSection
                challenge={challenge}
                guesses={guesses}
                remainingGuesses={remainingGuesses}
                hasWon={hasWon}
              />
            </div>
          </div>
        </div>

        <div className="input-section">
          {hasWon ? (
            <div className="victory-message">🎉 Congratulations! You found the private key!</div>
          ) : remainingGuesses > 0 ? (
            <GuessForm
              onSubmit={handleGuessSubmit}
              isLoading={submitting}
              remainingGuesses={remainingGuesses}
              compact={false}
            />
          ) : (
            <div className="game-over-message">
              Game Over - All guesses used. Try again tomorrow!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePage;
