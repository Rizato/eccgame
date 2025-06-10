import React, { useEffect } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';
import './PlaceholderLayout.css';
import './PracticeMode.css';

const PracticeMode: React.FC = () => {
  const { practiceChallenge, difficulty, isGenerating, generatePracticeChallenge } =
    usePracticeModeRedux();

  // TODO Move these both to practice mode redux
  // Initialize with first challenge
  useEffect(() => {
    if (!practiceChallenge || isGenerating) {
      generatePracticeChallenge();
    }
  }, [difficulty]);

  // Generate initial challenge on mount
  useEffect(() => {
    if (!practiceChallenge && !isGenerating) {
      generatePracticeChallenge();
    }
  }, []);

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground isPracticeMode={true} />
      </div>
    </div>
  );
};

export default PracticeMode;
