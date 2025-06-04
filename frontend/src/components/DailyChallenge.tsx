import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';

const DailyChallenge: React.FC = () => {
  const { challenge, handleSolve } = useGameStateRedux();

  if (!challenge) {
    return null; // This shouldn't happen as ErrorState handles null challenges
  }

  return (
    <>
      <div className="challenge-info-row">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground challenge={challenge} onSolve={handleSolve} isPracticeMode={false} />
      </div>
    </>
  );
};

export default DailyChallenge;
