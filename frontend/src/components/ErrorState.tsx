import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';

const ErrorState: React.FC = () => {
  const { error, loadDailyChallenge } = useGameStateRedux();

  return (
    <div className="error-state">
      <h2>Unable to load challenge</h2>
      <p>{error || 'Something went wrong. Please try again.'}</p>
      <button onClick={loadDailyChallenge} className="retry-button">
        Try Again
      </button>
    </div>
  );
};

export default ErrorState;
