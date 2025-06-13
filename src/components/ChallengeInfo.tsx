import React, { useEffect, useRef, useState } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setShowVictoryModal } from '../store/slices/eccCalculatorSlice';
import { setGaveUp, setHasWon } from '../store/slices/gameSlice';
import { togglePrivateKeyDisplayMode } from '../store/slices/uiSlice';
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
  const privateKeyDisplayMode = useAppSelector(state => state.ui.privateKeyDisplayMode);
  const privateKeyHexMode = privateKeyDisplayMode === 'hex';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Start collapsed on mobile
    return window.innerWidth <= 768;
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
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

  // Handle window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsCollapsed(false); // Always expanded on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!currentChallenge || (isPracticeMode && isGenerating)) {
    return (
      <div className="challenge-info-container">
        <div className="challenge-info-content">
          <div
            className={`challenge-header ${isMobile ? 'collapsible' : ''}`}
            onClick={isMobile ? () => setIsCollapsed(!isCollapsed) : undefined}
          >
            <h4 className="address-heading">
              {isPracticeMode
                ? 'Practice Wallet'
                : `Daily Wallet${currentChallenge?.id !== undefined ? ` #${currentChallenge.id}` : ''}`}
            </h4>
            <div className="header-actions">
              {isMobile && <button className="collapse-button">{isCollapsed ? '▼' : '▲'}</button>}
            </div>
          </div>
          {(!isCollapsed || !isMobile) && (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="challenge-info-container">
        <div className="challenge-info-content">
          <div
            className={`challenge-header ${isMobile ? 'collapsible' : ''}`}
            onClick={isMobile ? () => setIsCollapsed(!isCollapsed) : undefined}
          >
            <h4 className="address-heading">
              {isPracticeMode
                ? `Practice Wallet${currentChallenge?.id !== undefined ? ` #${currentChallenge.id}` : ''}`
                : `Daily Wallet${currentChallenge?.id !== undefined ? ` #${currentChallenge.id}` : ''}`}
            </h4>
            <div className="header-actions">
              {isMobile && <button className="collapse-button">{isCollapsed ? '▼' : '▲'}</button>}
            </div>
          </div>
          {(!isCollapsed || !isMobile) && (
            <>
              <div className="info-section">
                <div className="address-row">
                  <code className="address-code">{currentChallenge.p2pkh_address}</code>
                  {!isPracticeMode && (
                    <a
                      href={`${import.meta.env.VITE_EXPLORER_BASE_URL}${currentChallenge.p2pkh_address}`}
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
                      onClick={e => {
                        e.stopPropagation();
                        dispatch(togglePrivateKeyDisplayMode());
                      }}
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

              <div className="challenge-actions">
                {isPracticeMode && (
                  <div className="combined-control" ref={dropdownRef}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        !isGenerating && setShowDifficultyDropdown(!showDifficultyDropdown);
                      }}
                      className={`details-button combined-control-button ${isGenerating ? 'disabled' : ''}`}
                      disabled={isGenerating}
                      title={isGenerating ? 'Generating new challenge...' : 'Create new challenge'}
                    >
                      {isGenerating ? 'Generating...' : 'New Challenge ▼'}
                    </button>
                    {showDifficultyDropdown && !isGenerating && (
                      <div className="difficulty-dropdown">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDifficulty('easy');
                            generatePracticeChallenge();
                            setShowDifficultyDropdown(false);
                          }}
                          className="difficulty-option"
                        >
                          Easy
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setDifficulty('medium');
                            generatePracticeChallenge();
                            setShowDifficultyDropdown(false);
                          }}
                          className="difficulty-option"
                        >
                          Medium
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
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
                    onClick={e => {
                      e.stopPropagation();
                      handleGiveUp();
                    }}
                    className={`details-button give-up-button header-give-up ${!enableGiveUpButton ? 'disabled' : ''}`}
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
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ChallengeInfo;
