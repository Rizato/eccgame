import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import ECCPlayground from './ECCPlayground';

const DailyChallenge: React.FC = () => {
  const { challenge } = useGameStateRedux();

  if (!challenge) {
    return null; // This shouldn't happen as ErrorState handles null challenges
  }

  return (
    <div className="daily-challenge-container">
      <div className="playground-container">
        <ECCPlayground challenge={challenge} isPracticeMode={false} />
      </div>
    </div>
  );
};

export default DailyChallenge;
