import React, { useEffect } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import ECCPlayground from './ECCPlayground';
import './PracticeMode.css';

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
      <div className="playground-container">
        <ECCPlayground
          challenge={!practiceChallenge || isGenerating ? null : practiceChallenge}
          isPracticeMode={true}
          practicePrivateKey={practicePrivateKey}
        />
      </div>
    </div>
  );
};

export default PracticeMode;
