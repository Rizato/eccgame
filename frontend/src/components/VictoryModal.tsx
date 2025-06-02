import React from 'react';
import { createPortal } from 'react-dom';
import { type ECPoint } from '../utils/ecc';
import type { Operation } from '../utils/privateKeyCalculation.ts';
import { calculateVictoryPrivateKey } from '../utils/victoryPrivateKeyCalculation';
import './VictoryModal.css';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationCount: number;
  challengeAddress: string;
  startingMode: 'challenge' | 'generator';
  targetPoint: ECPoint;
  operations: Operation[];
  isPracticeMode?: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  operationCount,
  challengeAddress,
  startingMode,
  targetPoint,
  operations,
  isPracticeMode = false,
}) => {
  if (!isOpen) return null;

  // Calculate the private key for the victory screen
  const victoryPrivateKey =
    '0x' +
    calculateVictoryPrivateKey(operations, startingMode, targetPoint.isInfinity).toString(16);

  const getVictoryTitle = () => {
    if (isPracticeMode) {
      return 'Practice Complete! 🎉';
    }

    if (targetPoint.isInfinity) {
      return 'Point at Infinity Reached! ♾️';
    }

    return startingMode === 'challenge' ? 'Generator Point Found! 🎯' : 'Challenge Point Found! 🎯';
  };

  const getVictoryMessage = () => {
    if (isPracticeMode) {
      return 'Great work! You successfully solved the practice challenge.';
    }

    if (targetPoint.isInfinity) {
      return 'Incredible! You reached the point at infinity through your calculations.';
    }

    return startingMode === 'challenge'
      ? 'Congratulations! You successfully found the generator point from the challenge address.'
      : 'Amazing! You found the challenge address starting from the generator point.';
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
            <div className="stat-label">Direction</div>
            <div className="stat-value">
              {startingMode === 'challenge' ? 'Challenge → Generator' : 'Generator → Challenge'}
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
