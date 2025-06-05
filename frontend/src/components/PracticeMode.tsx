import React, { useEffect } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import ChallengeInfo from './ChallengeInfo';
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
  }, [difficulty]);

  // Generate initial challenge on mount
  useEffect(() => {
    if (!practiceChallenge && !isGenerating) {
      generatePracticeChallenge();
    }
  }, []);

  const handleSolve = async (submittedPrivateKey: string) => {
    if (submittedPrivateKey === practicePrivateKey) {
      alert('🎉 Congratulations! You solved the practice challenge!');
    } else {
      alert("❌ That's not quite right. Keep trying!");
    }
  };

  if (!practiceChallenge || isGenerating) {
    return (
      <div className="practice-mode">
        <div className="loading">Generating practice challenge...</div>
      </div>
    );
  }

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground
          challenge={practiceChallenge}
          onSolve={handleSolve}
          isPracticeMode={true}
          practicePrivateKey={practicePrivateKey}
        />
      </div>
    </div>
  );
};

export default PracticeMode;
