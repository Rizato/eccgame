import React from 'react';
import { useAppSelector } from '../store/hooks';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';

const DailyChallenge: React.FC = () => {
  const graph = useAppSelector(state => state.dailyCalculator.graph);

  // TODO Move this to ChallengeInfo
  // Count total operations by summing all bundled edges
  const operationCount = Object.values(graph.edges).reduce((total, edge) => {
    return total + (edge.bundleCount ? Number(edge.bundleCount) : 1);
  }, 0);

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo operationCount={operationCount} />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground isPracticeMode={false} />
      </div>
    </div>
  );
};

export default DailyChallenge;
