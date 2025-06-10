import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './VictoryModal.css';
import { generateShareMessage, shareMessage } from '../utils/gameUtils';
import { getPublicKeyFromPrivate } from '../utils/crypto.ts';
import { useAppSelector } from '../store/hooks';
import { useUIRedux } from '../hooks/useUIRedux';
import { useGameStateRedux } from '../hooks/useGameStateRedux';

export const VictoryModal: React.FC = () => {
  const { showVictoryModal, closeVictory } = useUIRedux();
  const { gaveUp, gameMode } = useGameStateRedux();

  // Get mode-specific data
  const isPracticeMode = gameMode === 'practice';
  const dailyVictoryData = useAppSelector(state => ({
    privateKey: state.dailyMode.victoryPrivateKey,
    signature: state.dailyMode.signature,
  }));
  const practiceVictoryData = useAppSelector(state => ({
    privateKey: state.practiceMode.practicePrivateKey,
    signature: '', // Practice mode doesn't have signatures
  }));

  const victoryData = isPracticeMode ? practiceVictoryData : dailyVictoryData;
  const victoryPrivateKey = victoryData.privateKey;
  const signature = victoryData.signature;

  // Get challenge address
  const challengeAddress = useAppSelector(state =>
    isPracticeMode ? state.practiceMode.challengeAddress : state.game.challenge?.p2pkh_address || ''
  );

  // Calculate operation count from graph
  const operationCount = useAppSelector(state => {
    const graph = isPracticeMode ? state.practiceCalculator.graph : state.dailyCalculator.graph;
    return Object.values(graph.edges).reduce((total, edge) => {
      return total + (edge.bundleCount ? Number(edge.bundleCount) : 1);
    }, 0);
  });

  const onClose = closeVictory;
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [privateKeyHexMode, setPrivateKeyHexMode] = useState(true);
  if (!showVictoryModal) return null;

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
            <div className="stat-label">Wallet Address</div>
            <div className="stat-value address-value" title={challengeAddress}>
              {challengeAddress}
            </div>
          </div>

          {!gaveUp && (
            <div className="stat-item">
              <div className="stat-label">Private Key</div>
              <div className="modal-value-container">
                <span
                  className="stat-value address-value clickable"
                  onClick={() => setPrivateKeyHexMode(!privateKeyHexMode)}
                  title={
                    privateKeyHexMode ? 'Click to switch to decimal' : 'Click to switch to hex'
                  }
                >
                  {(() => {
                    try {
                      const keyValue = victoryPrivateKey.startsWith('0x')
                        ? victoryPrivateKey.slice(2)
                        : victoryPrivateKey;
                      const keyBigInt = BigInt('0x' + keyValue);
                      return privateKeyHexMode
                        ? '0x' + keyBigInt.toString(16)
                        : keyBigInt.toString();
                    } catch {
                      return victoryPrivateKey;
                    }
                  })()}
                </span>
                <button
                  className="copy-button"
                  onClick={() => {
                    try {
                      const keyValue = victoryPrivateKey.startsWith('0x')
                        ? victoryPrivateKey.slice(2)
                        : victoryPrivateKey;
                      const keyBigInt = BigInt('0x' + keyValue);
                      const textToCopy = privateKeyHexMode
                        ? '0x' + keyBigInt.toString(16)
                        : keyBigInt.toString();
                      navigator.clipboard.writeText(textToCopy);
                    } catch {
                      navigator.clipboard.writeText(victoryPrivateKey);
                    }
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="stat-item">
            <div className="stat-label">{gaveUp ? 'Steps tried' : 'Steps to solve'}</div>
            <div className="stat-value">{operationCount}</div>
          </div>

          {signature && !gaveUp && (
            <div className="stat-item">
              <div className="stat-label">Cryptographic Signature Message</div>
              <div className="modal-value-container">
                <span className="stat-value address-value">
                  {getPublicKeyFromPrivate(victoryPrivateKey)}
                </span>
                <button
                  className="copy-button"
                  onClick={() =>
                    navigator.clipboard.writeText(getPublicKeyFromPrivate(victoryPrivateKey))
                  }
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          {signature && !gaveUp && (
            <div className="stat-item">
              <div className="stat-label">Cryptographic Signature</div>
              <div className="modal-value-container">
                <span className="stat-value address-value">{signature}</span>
                <button
                  className="copy-button"
                  onClick={() => navigator.clipboard.writeText(signature)}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          {signature && !gaveUp && (
            <div className="stat-item">
              <div className="stat-label">Bitcoin-cli Verification Command</div>
              <div className="modal-value-container">
                <span className="stat-value address-value">
                  {`bitcoin-cli verifymessage "${challengeAddress}" "${signature}" "${getPublicKeyFromPrivate(victoryPrivateKey)}"`}
                </span>
                <button
                  className="copy-button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `bitcoin-cli verifymessage "${challengeAddress}" "${signature}" "${getPublicKeyFromPrivate(victoryPrivateKey)}"`
                    )
                  }
                >
                  Copy
                </button>
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
