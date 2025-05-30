import React from 'react';
import type { GuessResponse } from '../types/api';
import GuessCard from './GuessCard';
import './GuessHistory.css';

interface GuessHistoryProps {
  guesses: GuessResponse[];
  targetAddress?: string;
}

const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses, targetAddress = '' }) => {
  if (guesses.length === 0) {
    return (
      <div className="guess-history-container">
        <h3>Your Guesses</h3>
        <div className="no-guesses">No guesses submitted yet. Make your first guess above!</div>
      </div>
    );
  }

  return (
    <div className="guess-history-container">
      <h3>Your Guesses ({guesses.length}/6)</h3>
      <div className="guess-history">
        {guesses.map((guess, index) => (
          <GuessCard
            key={guess.uuid}
            guess={guess}
            guessNumber={guesses.length - index}
            targetAddress={targetAddress}
          />
        ))}
      </div>
    </div>
  );
};

export default GuessHistory;
