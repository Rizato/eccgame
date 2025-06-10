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
  const gaveUp = useAppSelector(state => state.game.gaveUp);

  const { practicePrivateKey, setDifficulty, generatePracticeChallenge, isGenerating } =
    usePracticeModeRedux();

  const isPracticeMode = gameMode === 'practice';
  const currentChallenge = isPracticeMode ? practiceChallenge : challenge;
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [privateKeyHexMode, setPrivateKeyHexMode] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Always show give up button in daily mode, but enable only after 3 operations and when not won/given up
  const showGiveUpButton = !isPracticeMode;
  const enableGiveUpButton = !isPracticeMode && operationCount >= 3 && !hasWon && !gaveUp;

  const handleGiveUp = () => {
    // Update game state
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

  if (!currentChallenge || (isPracticeMode && isGenerating)) {
    return (
      <div className="challenge-info-container">
        <div className="challenge-info-content">
          <div className="challenge-header">
            <h4 className="address-heading">
              {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
            </h4>
            <div className="header-actions">
              {isPracticeMode && (
                <button className="details-button combined-control-button disabled" disabled>
                  New Challenge ▼
                </button>
              )}
              {!isPracticeMode && (
                <button className="give-up-button header-give-up disabled" disabled>
                  Give Up
                </button>
              )}
            </div>
          </div>
          <div className="info-section">
            <div className="address-row">
              <code className="address-code loading-placeholder">
                {isPracticeMode ? 'Generating new challenge...' : 'Loading challenge...'}
              </code>
              {!isPracticeMode && (
                <div className="explorer-link loading-placeholder">View Explorer</div>
              )}
            </div>
          </div>
          {isPracticeMode && (
            <div className="info-section">
              <label>Private Key:</label>
              <div className="private-key-display-container">
                <span className="private-key-display loading-placeholder">Generating...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="challenge-info-container">
        <div className="challenge-info-content">
          <div className="challenge-header">
            <h4 className="address-heading">
              {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
            </h4>
            <div className="header-actions">
              {isPracticeMode && (
                <div className="combined-control" ref={dropdownRef}>
                  <button
                    onClick={() =>
                      !isGenerating && setShowDifficultyDropdown(!showDifficultyDropdown)
                    }
                    className={`details-button combined-control-button ${isGenerating ? 'disabled' : ''}`}
                    disabled={isGenerating}
                    title={isGenerating ? 'Generating new challenge...' : 'Create new challenge'}
                  >
                    {isGenerating ? 'Generating...' : 'New Challenge ▼'}
                  </button>
                  {showDifficultyDropdown && !isGenerating && (
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
              {showGiveUpButton && (
                <button
                  onClick={handleGiveUp}
                  className={`give-up-button header-give-up ${!enableGiveUpButton ? 'disabled' : ''}`}
                  disabled={!enableGiveUpButton}
                  title={
                    !enableGiveUpButton
                      ? 'Available after 3 operations'
                      : 'Give up and reveal solution'
                  }
                >
                  Give Up
                </button>
              )}
            </div>
          </div>
          <div className="info-section">
            <div className="address-row">
              <code className="address-code">{currentChallenge.p2pkh_address}</code>
              {!isPracticeMode && (
                <a
                  href={`https://blockstream.info/address/${currentChallenge.p2pkh_address}`}
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

          {!isPracticeMode && currentChallenge.tags && currentChallenge.tags.length > 0 && (
            <div className="info-section">
              <label>Tags:</label>
              <div className="metadata-tags">
                {currentChallenge.tags.map((tag, index) => (
                  <span key={tag || index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ChallengeInfo;
