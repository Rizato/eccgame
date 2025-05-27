import React, { useState, useEffect } from 'react';
import type { Challenge, GuessRequest, GuessResponse } from '../types/api';
import { challengeApi } from '../services/api';
import ChallengeCard from '../components/ChallengeCard';
import GuessForm from '../components/GuessForm';
import GuessHistory from '../components/GuessHistory';
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

  const handleGuessSubmit = async (guess: GuessRequest) => {
    if (!challenge) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await challengeApi.submitGuess(challenge.uuid, guess);

      // Add the new guess to the beginning of the list (most recent first)
      setGuesses(prev => [result, ...prev]);

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
        setError('Invalid guess format. Please check your public key and signature.');
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
        <h1>🔐 Crypto Guesser</h1>
        <p>Find the private key that controls this Bitcoin address!</p>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <main className="game-content">
        <ChallengeCard challenge={challenge} />

        {hasWon ? (
          <div className="victory-message">
            <h2>🎉 Congratulations!</h2>
            <p>You successfully found the private key! Come back tomorrow for a new challenge.</p>
          </div>
        ) : (
          <GuessForm
            onSubmit={handleGuessSubmit}
            isLoading={submitting}
            remainingGuesses={remainingGuesses}
          />
        )}

        <GuessHistory guesses={guesses} />
      </main>
    </div>
  );
};

export default GamePage;
