import React, { useEffect } from 'react';
import { usePracticeMode } from '../hooks/usePracticeMode';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';
import './PracticeMode.css';

const PracticeMode: React.FC = () => {
  const {
    practicePrivateKey,
    practiceChallenge,
    difficulty,
    isGenerating,
    setDifficulty,
    generatePracticeChallenge,
  } = usePracticeMode();

  // Initialize with first challenge
  useEffect(() => {
    generatePracticeChallenge();
  }, [difficulty, generatePracticeChallenge]);

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
    <>
      <div className="challenge-info-row">
        <div className="challenge-info-card">
          <ChallengeInfo
            challenge={practiceChallenge}
            isPracticeMode={true}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onNewChallenge={generatePracticeChallenge}
            practicePrivateKey={practicePrivateKey}
          />
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
    </>
  );
};

export default PracticeMode;
