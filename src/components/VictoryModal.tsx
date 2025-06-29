import React, { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { togglePrivateKeyDisplayMode } from '../store/slices/uiSlice';
import { getPublicKeyFromPrivate } from '../utils/crypto.ts';
import { generateShareMessage, shareMessage } from '../utils/gameUtils';
import Modal from './Modal';
import type { SavedPoint } from '../types/ecc.ts';
import type { Challenge } from '../types/game.ts';
import './VictoryModal.css';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationCount: number;
  savedPoints: SavedPoint[];
  isPracticeMode?: boolean;
  victoryPrivateKey: string;
  signature?: string;
  gaveUp?: boolean;
  challenge?: Challenge | null;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  operationCount,
  victoryPrivateKey,
  isPracticeMode,
  signature,
  gaveUp = false,
  challenge,
}) => {
  const dispatch = useAppDispatch();
  const privateKeyDisplayMode = useAppSelector(state => state.ui.privateKeyDisplayMode);
  const privateKeyHexMode = privateKeyDisplayMode === 'hex';
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const victoryPublicKey = useMemo(() => {
    if (gaveUp || !victoryPrivateKey) {
      return '';
    }
    try {
      return getPublicKeyFromPrivate(victoryPrivateKey);
    } catch (error) {
      console.error('Failed to generate public key:', error);
      return '';
    }
  }, [gaveUp, victoryPrivateKey]);

  if (!isOpen || !challenge || !(victoryPrivateKey || gaveUp)) return null;
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
      return 'Great work! You successfully solved the practice private key.';
    }

    return 'Incredible! You successfully found the private key from the public key.';
  };

  const handleShare = async () => {
    const message = generateShareMessage({
      gameMode: isPracticeMode ? 'practice' : 'daily',
      solved: !gaveUp,
      operationCount,
      challenge: challenge || null,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${gaveUp ? '🤷' : '🏆'} ${getVictoryTitle()}`}
      subtitle={getVictoryMessage()}
      className="victory-modal"
    >
      <div className="victory-stats">
        <div className="stat-item">
          <div className="stat-label">Wallet Address</div>
          <div className="modal-value-container">
            <span className="stat-value address-value" title={challenge.p2pkh_address}>
              {challenge.p2pkh_address}
            </span>
          </div>
        </div>

        {!gaveUp && (
          <div className="stat-item">
            <div className="stat-label">Private Key</div>
            <div className="modal-value-container">
              <span
                className="stat-value address-value clickable"
                onClick={() => dispatch(togglePrivateKeyDisplayMode())}
                title={privateKeyHexMode ? 'Click to switch to decimal' : 'Click to switch to hex'}
              >
                {(() => {
                  try {
                    const keyValue = victoryPrivateKey.startsWith('0x')
                      ? victoryPrivateKey.slice(2)
                      : victoryPrivateKey;
                    const keyBigInt = BigInt('0x' + keyValue);
                    return privateKeyHexMode ? '0x' + keyBigInt.toString(16) : keyBigInt.toString();
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
          <div className="stat-label">{gaveUp ? 'Point Operations tried' : 'Point Operations'}</div>
          <div className="stat-value address-value">{operationCount}</div>
        </div>

        {signature && !gaveUp && (
          <div className="stat-item">
            <div className="stat-label">Bitcoin-cli Verification Command</div>
            <div className="modal-value-container">
              <span className="stat-value address-value">
                {`bitcoin-cli verifymessage "${challenge.p2pkh_address}" "${signature}" "${victoryPublicKey}"`}
              </span>
              <button
                className="copy-button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    `bitcoin-cli verifymessage "${challenge.p2pkh_address}" "${signature}" "${victoryPublicKey}"`
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
    </Modal>
  );
};

export default VictoryModal;
