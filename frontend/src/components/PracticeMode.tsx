import React, { useEffect } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import ChallengeInfo from './ChallengeInfo';
import ECCPlayground from './ECCPlayground';
import './PlaceholderLayout.css';
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

  return (
    <div className="daily-challenge-container">
      <div className="challenge-info-sidebar">
        <div className="challenge-info-card">
          <ChallengeInfo />
        </div>
      </div>

      <div className="playground-container">
        {!practiceChallenge || isGenerating ? (
          <div className="playground-placeholder">
            <div className="placeholder-playground">
              <div className="placeholder-graph">
                <div className="placeholder-graph-header">
                  <div className="placeholder-title">ECC Graph</div>
                  <div className="placeholder-legend">
                    <div className="placeholder-legend-item"></div>
                    <div className="placeholder-legend-item"></div>
                    <div className="placeholder-legend-item"></div>
                  </div>
                </div>
                <div className="placeholder-graph-area"></div>
              </div>
              <div className="placeholder-calculator">
                <div className="placeholder-calculator-header">Calculator</div>
                <div className="placeholder-buttons">
                  <div className="placeholder-button-row">
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                  </div>
                  <div className="placeholder-button-row">
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                    <div className="placeholder-calc-button"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
