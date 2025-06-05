import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './VictoryModal.css';
import { generateShareMessage, shareMessage } from '../utils/shareMessage';
import type { SavedPoint } from '../types/ecc.ts';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationCount: number;
  challengeAddress: string;
  savedPoints: SavedPoint[];
  isPracticeMode?: boolean;
  victoryPrivateKey: string;
  gaveUp?: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  operationCount,
  challengeAddress,
  victoryPrivateKey,
  isPracticeMode,
  gaveUp = false,
}) => {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  if (!isOpen) return null;

  const getVictoryTitle = () => {
    if (gaveUp) {
      return 'Gave Up.';
    }
    if (isPracticeMode) {
      return 'Practice Complete!';
    }
    return 'Private Key Found!';
  };

  const getVictoryMessage = () => {
    if (gaveUp) {
      return "Don't feel bad, this is literally impossible.";
    }
    if (isPracticeMode) {
      return 'Great work! You successfully solved the practice challenge.';
    }

    return 'Incredible! You successfully found the private key from the public key.';
  };

  const handleShare = async () => {
    const message = generateShareMessage({
      gameMode: isPracticeMode ? 'practice' : 'daily',
      solved: !gaveUp,
      operationCount,
      challengeAddress,
      gaveUp,
    });

    try {
      const result = await shareMessage(message);
      if (result.success) {
        setShareStatus(result.method === 'share' ? 'Shared!' : 'Copied to clipboard!');
        setTimeout(() => setShareStatus(null), 2000);
      } else {
        setShareStatus('Failed to share');
        setTimeout(() => setShareStatus(null), 2000);
      }
    } catch (error) {
      console.error('Share failed:', error);
      setShareStatus('Share failed');
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  return createPortal(
    <div className="victory-modal-overlay" onClick={onClose}>
      <div className="victory-modal" onClick={e => e.stopPropagation()}>
        <div className="victory-header">
          <button className="victory-close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
          <div className="victory-icon">{gaveUp ? '🤷' : '🏆'}</div>
          <h2 className="victory-title">{getVictoryTitle()}</h2>
          <p className="victory-message">{getVictoryMessage()}</p>
        </div>

        <div className="victory-stats">
          <div className="stat-item">
            <div className="stat-label">Operations Used</div>
            <div className="stat-value">{operationCount}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">
              {isPracticeMode ? 'Practice Wallet' : 'Challenge Wallet'}
            </div>
            <div className="stat-value address-value" title={challengeAddress}>
              {challengeAddress}
            </div>
          </div>

          {!gaveUp && (
            <div className="stat-item">
              <div className="stat-label">Private Key</div>
              <div className="stat-value address-value" title={victoryPrivateKey}>
                {victoryPrivateKey}
              </div>
            </div>
          )}
        </div>

        <div className="victory-actions">
          <button onClick={handleShare} className="victory-share-button" autoFocus>
            {shareStatus || 'Share Result'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VictoryModal;
