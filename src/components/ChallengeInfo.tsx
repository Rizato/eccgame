import React, { useEffect, useState } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { togglePrivateKeyDisplayMode } from '../store/slices/uiSlice';
import './ChallengeInfo.css';

const ChallengeInfo: React.FC = () => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const challenge = useAppSelector(state => state.game.challenge);
  const practiceChallenge = useAppSelector(state => state.practiceMode.practiceChallenge);

  const { practicePrivateKey, isGenerating } = usePracticeModeRedux();

  const isPracticeMode = gameMode === 'practice';
  const currentChallenge = isPracticeMode ? practiceChallenge : challenge;
  const privateKeyDisplayMode = useAppSelector(state => state.ui.privateKeyDisplayMode);
  const privateKeyHexMode = privateKeyDisplayMode === 'hex';
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Start collapsed on mobile
    return window.innerWidth <= 768;
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

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
              {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
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
                    {isPracticeMode ? 'Generating new wallet...' : 'Loading goal...'}
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
              {isPracticeMode ? 'Practice Wallet' : 'Daily Wallet'}
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
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ChallengeInfo;
