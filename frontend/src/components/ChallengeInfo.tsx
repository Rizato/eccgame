import React, { useEffect, useRef, useState } from 'react';
import type { Challenge } from '../types/api';
import './ChallengeInfo.css';
import { Modal } from './Modal';

interface ChallengeInfoProps {
  challenge: Challenge;
  isPracticeMode?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  onDifficultyChange?: (difficulty: 'easy' | 'medium' | 'hard') => void;
  onNewChallenge?: () => void;
  practicePrivateKey?: string;
}

const ChallengeInfo: React.FC<ChallengeInfoProps> = ({
  challenge,
  isPracticeMode,
  difficulty,
  onDifficultyChange,
  onNewChallenge,
  practicePrivateKey,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const [privateKeyHexMode, setPrivateKeyHexMode] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
              <code className="address-code">{challenge.p2pkh_address}</code>
              <button onClick={() => setShowDetailsModal(true)} className="details-button">
                Details
              </button>
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
                          onDifficultyChange?.('easy');
                          onNewChallenge?.();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        New Easy Challenge
                      </button>
                      <button
                        onClick={() => {
                          onDifficultyChange?.('medium');
                          onNewChallenge?.();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        New Medium Challenge
                      </button>
                      <button
                        onClick={() => {
                          onDifficultyChange?.('hard');
                          onNewChallenge?.();
                          setShowDifficultyDropdown(false);
                        }}
                        className="difficulty-option"
                      >
                        New Hard Challenge
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isPracticeMode && challenge.explorer_link && (
                <a
                  href={challenge.explorer_link}
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

          {!isPracticeMode && challenge.metadata && challenge.metadata.length > 0 && (
            <div className="info-section">
              <label>Tags:</label>
              <div className="metadata-tags">
                {challenge.metadata.map(meta => (
                  <span key={meta.id} className="tag">
                    {meta.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={isPracticeMode ? 'Practice Challenge Details' : 'Challenge Details'}
        challenge={challenge}
        isPracticeMode={isPracticeMode}
        practicePrivateKey={practicePrivateKey}
      />
    </>
  );
};

export default ChallengeInfo;
