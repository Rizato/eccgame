import React from 'react';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';

const DailyChallenge: React.FC = () => {
  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground isPracticeMode={false} />
      </div>
    </div>
  );
};

export default DailyChallenge;
