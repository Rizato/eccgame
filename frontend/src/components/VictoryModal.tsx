import React from 'react';
import { createPortal } from 'react-dom';
import './VictoryModal.css';
import type { SavedPoint } from '../types/ecc.ts';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationCount: number;
  challengeAddress: string;
  savedPoints: SavedPoint[];
  isPracticeMode?: boolean;
  victoryPrivateKey: string;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  operationCount,
  challengeAddress,
  victoryPrivateKey,
  isPracticeMode,
}) => {
  if (!isOpen) return null;

  const getVictoryTitle = () => {
    if (isPracticeMode) {
      return 'Practice Complete! 🎉';
    }
    return 'Private Key Found!  🎉';
  };

  const getVictoryMessage = () => {
    if (isPracticeMode) {
      return 'Great work! You successfully solved the practice challenge.';
    }

    return 'Incredible! You successfully found the private key from the public key.';
  };

  return createPortal(
    <div className="victory-modal-overlay" onClick={onClose}>
      <div className="victory-modal" onClick={e => e.stopPropagation()}>
        <div className="victory-header">
          <div className="victory-icon">🏆</div>
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

          <div className="stat-item">
            <div className="stat-label">Private Key</div>
            <div className="stat-value address-value" title={victoryPrivateKey}>
              {victoryPrivateKey}
            </div>
          </div>
        </div>

        <div className="victory-actions">
          <button onClick={onClose} className="victory-close-button" autoFocus>
            {isPracticeMode ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VictoryModal;
