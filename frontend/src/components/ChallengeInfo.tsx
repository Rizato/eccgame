import React, { useEffect, useRef, useState } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setShowVictoryModal } from '../store/slices/eccCalculatorSlice';
import { setGaveUp, setHasWon } from '../store/slices/gameSlice';
import './ChallengeInfo.css';

interface ChallengeInfoProps {
  operationCount?: number;
}

const ChallengeInfo: React.FC<ChallengeInfoProps> = ({ operationCount = 0 }) => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const challenge = useAppSelector(state => state.game.challenge);
  const practiceChallenge = useAppSelector(state => state.practiceMode.practiceChallenge);
  const hasWon = useAppSelector(state => state.game.hasWon);

  const { difficulty, practicePrivateKey, setDifficulty, generatePracticeChallenge } =
    usePracticeModeRedux();

  const isPracticeMode = gameMode === 'practice';
  const currentChallenge = isPracticeMode ? practiceChallenge : challenge;
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [privateKeyHexMode, setPrivateKeyHexMode] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show give up button after 3 operations in daily mode only, but hide it after winning
  const showGiveUpButton = !isPracticeMode && operationCount >= 3 && !hasWon;

  const handleGiveUp = () => {
    dispatch(setGaveUp(true));
    dispatch(setHasWon(true)); // Show victory modal
    dispatch(setShowVictoryModal(true));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDifficultyDropdown(false);
      }
    };

    if (showDifficultyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDifficultyDropdown]);

  if (!currentChallenge) {
    return (
      <div className="challenge-info-container">
        <div className="challenge-info-content">
          <div className="info-section">
            <p>Loading challenge...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="challenge-info-container">
        <div className="challenge-header"></div>

        <div className="challenge-info-content">
          <div className="info-section">
            <h4 className="address-heading">
              {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
            </h4>
            <div className="address-row">
              <code className="address-code">{currentChallenge.p2pkh_address}</code>
              {isPracticeMode && (
                <div className="combined-control" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
                    className="details-button combined-control-button"
                  >
                    New Challenge (
                    {difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard'})
                    ▼
                  </button>
                  {showDifficultyDropdown && (
                    <div className="difficulty-dropdown">
                      <button
                        onClick={() => {
                          setDifficulty('easy');
                          generatePracticeChallenge();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        Easy
                      </button>
                      <button
                        onClick={() => {
                          setDifficulty('medium');
                          generatePracticeChallenge();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        Medium
                      </button>
                      <button
                        onClick={() => {
                          setDifficulty('hard');
                          generatePracticeChallenge();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        Hard
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isPracticeMode && currentChallenge.explorer_link && (
                <a
                  href={currentChallenge.explorer_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  View Explorer
                </a>
              )}
            </div>
          </div>

          {isPracticeMode && practicePrivateKey && (
            <div className="info-section">
              <label>Private Key:</label>
              <div className="private-key-display-container">
                <span
                  className="private-key-display clickable"
                  onClick={() => setPrivateKeyHexMode(!privateKeyHexMode)}
                  title={
                    privateKeyHexMode ? 'Click to switch to decimal' : 'Click to switch to hex'
                  }
                >
                  {privateKeyHexMode
                    ? '0x' + BigInt('0x' + practicePrivateKey).toString(16)
                    : BigInt('0x' + practicePrivateKey).toString()}
                </span>
              </div>
            </div>
          )}

          {!isPracticeMode && currentChallenge.metadata && currentChallenge.metadata.length > 0 && (
            <div className="info-section">
              <label>Tags:</label>
              <div className="metadata-tags">
                {currentChallenge.metadata.map((meta, index) => (
                  <span key={meta.name || index} className="tag">
                    {meta.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {showGiveUpButton && (
            <div className="info-section">
              <div className="give-up-button-container">
                <button onClick={handleGiveUp} className="give-up-button">
                  Give Up
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChallengeInfo;
