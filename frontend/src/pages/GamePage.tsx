import React, { useState, useEffect } from 'react';
import type { Challenge, GuessResponse } from '../types/api';
import { challengeApi } from '../services/api';
import { generateGuessFromPrivateKey } from '../utils/crypto';
import { storageUtils } from '../utils/storage';
import ChallengeInfoPanel from '../components/ChallengeInfoPanel';
import GuessForm from '../components/GuessForm';
import GuessCard from '../components/GuessCard';
import ThemeToggle from '../components/ThemeToggle';
import './GamePage.css';

const MAX_GUESSES = 6; // Should match backend setting

const GamePage: React.FC = () => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [guesses, setGuesses] = useState<GuessResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <div className="header-text">
            <h1>🔐 Crypto Guesser</h1>
            <p>Find the private key that controls this Bitcoin address!</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="game-content">
        <ChallengeInfoPanel challenge={challenge} guessCount={guesses.length} />

        <section className="game-grid-section">
          <div className="security-warning">
            <span className="warning-icon">⚠️</span>
            <div className="warning-text">
              <strong>Security Warning:</strong> NEVER enter your wallet's private keys into any
              website. Only use test keys or generated keys for this game.
            </div>
          </div>

          <div className="game-grid-header">
            <h3>Your Guesses ({guesses.length}/6)</h3>
            {!hasWon && remainingGuesses > 0 && (
              <span className={`remaining-guesses ${remainingGuesses <= 2 ? 'warning' : ''}`}>
                {remainingGuesses} remaining
              </span>
            )}
          </div>

          <div className="game-grid">
            {/* Render completed guesses */}
            {guesses.map((guess, index) => (
              <GuessCard
                key={guess.uuid}
                guess={guess}
                guessNumber={guesses.length - index}
                targetAddress={challenge.p2pkh_address}
              />
            ))}

            {/* Render input form for next guess or victory message */}
            {hasWon ? (
              <div className="victory-message">
                <h2>🎉 Congratulations!</h2>
                <p>
                  You successfully found the private key! Come back tomorrow for a new challenge.
                </p>
              </div>
            ) : remainingGuesses > 0 ? (
              <div className="guess-input-row">
                <div className="guess-number-indicator">#{guesses.length + 1}</div>
                <GuessForm
                  onSubmit={handleGuessSubmit}
                  isLoading={submitting}
                  remainingGuesses={remainingGuesses}
                  compact={true}
                />
              </div>
            ) : (
              <div className="game-over-message">
                <h3>Game Over</h3>
                <p>You've used all your guesses. Come back tomorrow for a new challenge!</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default GamePage;
