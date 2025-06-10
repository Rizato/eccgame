import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import { useAppSelector } from '../store/hooks';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';

const DailyChallenge: React.FC = () => {
  const { challenge, handleSolve } = useGameStateRedux();
  const graph = useAppSelector(state => state.dailyCalculator.graph);

  // Count total operations by summing all bundled edges
  const operationCount = Object.values(graph.edges).reduce((total, edge) => {
    return total + (edge.bundleCount ? Number(edge.bundleCount) : 1);
  }, 0);

  if (!challenge) {
    return null; // This shouldn't happen as ErrorState handles null challenges
  }

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo operationCount={operationCount} />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground challenge={challenge} onSolve={handleSolve} isPracticeMode={false} />
      </div>
    </div>
  );
};

export default DailyChallenge;
