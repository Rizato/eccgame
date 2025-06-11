import React, { useEffect } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';
import './PlaceholderLayout.css';
import './PracticeMode.css';
import PlaceholderLayout from './PlaceholderLayout.tsx';

const PracticeMode: React.FC = () => {
  const {
    practicePrivateKey,
    practiceChallenge,
    difficulty,
    isGenerating,
    generatePracticeChallenge,
  } = usePracticeModeRedux();

  // Initialize with first challenge
  useEffect(() => {
    if (!practiceChallenge || isGenerating) {
      generatePracticeChallenge();
    }
  }, [generatePracticeChallenge, difficulty, isGenerating, practiceChallenge]);

  // Generate initial challenge on mount
  useEffect(() => {
    if (!practiceChallenge && !isGenerating) {
      generatePracticeChallenge();
    }
  });

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        {!practiceChallenge || isGenerating ? (
          <PlaceholderLayout message="Generating practice wallet..." isPracticeMode={true} />
        ) : (
          <ECCPlayground
            challenge={practiceChallenge}
            isPracticeMode={true}
            practicePrivateKey={practicePrivateKey}
          />
        )}
      </div>
    </div>
  );
};

export default PracticeMode;
