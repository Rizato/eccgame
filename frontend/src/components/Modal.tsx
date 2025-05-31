import React, { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Challenge } from '../types/api';
import { publicKeyToPoint } from '../utils/ecc';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  className?: string;
  // Challenge-specific props
  challenge?: Challenge;
  isPracticeMode?: boolean;
  practicePrivateKey?: string;
  // Point-specific props (for ECCPlayground)
  pointData?: {
    address: string;
    compressedKey: string;
    xCoordinate: string;
    yCoordinate: string;
    privateKey?: string;
    distanceToTarget?: string;
  };
}

interface ModalItemProps {
  label: string;
  value: string;
  onCopy?: () => void;
  type?: 'text' | 'password';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = 'point-modal',
  challenge,
  isPracticeMode = false,
  practicePrivateKey,
  pointData,
}) => {
  const [privateKeyHexMode, setPrivateKeyHexMode] = useState(true);

  if (!isOpen) return null;

  // If children are provided, use them (legacy mode)
  if (children) {
    return createPortal(
      <div className="modal-overlay" onClick={onClose}>
        <div className={className} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{title}</h3>
            <button onClick={onClose} className="modal-close">
              ×
            </button>
          </div>
          <div className="modal-content">{children}</div>
        </div>
      </div>,
      document.body
    );
  }

  // New self-contained modal
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className={className} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>
        <div className="modal-content">
          {/* Address */}
          <ModalItem
            label="Address"
            value={pointData?.address || challenge?.p2pkh_address || ''}
            onCopy={() =>
              navigator.clipboard.writeText(pointData?.address || challenge?.p2pkh_address || '')
            }
          />

          {/* Private Key (Practice Mode Only) */}
          {isPracticeMode && practicePrivateKey && (
            <div className="modal-item">
              <span className="modal-label">Private Key:</span>
              <div className="modal-value-container">
                <button
                  type="button"
                  onClick={() => setPrivateKeyHexMode(!privateKeyHexMode)}
                  className={`private-key-format-toggle ${privateKeyHexMode ? 'active' : ''}`}
                  aria-label={privateKeyHexMode ? 'Switch to decimal' : 'Switch to hex'}
                >
                  {privateKeyHexMode ? '0x' : '10'}
                </button>
                <input
                  className="modal-value-input"
                  type="text"
                  value={
                    privateKeyHexMode
                      ? '0x' + BigInt('0x' + practicePrivateKey).toString(16)
                      : BigInt('0x' + practicePrivateKey).toString()
                  }
                  readOnly
                />
                <button
                  className="copy-button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      privateKeyHexMode
                        ? '0x' + BigInt('0x' + practicePrivateKey).toString(16)
                        : BigInt('0x' + practicePrivateKey).toString()
                    )
                  }
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Distance to Target (Point data only) */}
          {pointData?.distanceToTarget && (
            <ModalItem
              label="Distance to Target"
              value={pointData.distanceToTarget}
              onCopy={() => navigator.clipboard.writeText(pointData.distanceToTarget || '')}
            />
          )}

          {/* Compressed Key */}
          <ModalItem
            label="Compressed Key"
            value={
              pointData?.compressedKey ||
              (() => {
                if (!challenge?.public_key) return '';
                try {
                  const pubKey = challenge.public_key;
                  if (
                    (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                    pubKey.length === 66
                  ) {
                    return pubKey;
                  } else if (pubKey.startsWith('04') && pubKey.length === 130) {
                    const x = pubKey.slice(2, 66);
                    const y = pubKey.slice(66);
                    const yBigInt = BigInt('0x' + y);
                    const prefix = yBigInt % 2n === 0n ? '02' : '03';
                    return prefix + x;
                  }
                  return 'Invalid key format';
                } catch {
                  return 'Parse error';
                }
              })()
            }
            onCopy={() => {
              const value =
                pointData?.compressedKey ||
                (() => {
                  if (!challenge?.public_key) return '';
                  try {
                    const pubKey = challenge.public_key;
                    if (
                      (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                      pubKey.length === 66
                    ) {
                      return pubKey;
                    } else if (pubKey.startsWith('04') && pubKey.length === 130) {
                      const x = pubKey.slice(2, 66);
                      const y = pubKey.slice(66);
                      const yBigInt = BigInt('0x' + y);
                      const prefix = yBigInt % 2n === 0n ? '02' : '03';
                      return prefix + x;
                    }
                    return '';
                  } catch {
                    return '';
                  }
                })();
              navigator.clipboard.writeText(value);
            }}
          />

          {/* X Coordinate */}
          <ModalItem
            label="X Coordinate"
            value={
              pointData?.xCoordinate ||
              (() => {
                if (!challenge?.public_key) return '';
                try {
                  const pubKey = challenge.public_key;
                  if (pubKey.startsWith('04') && pubKey.length === 130) {
                    return pubKey.slice(2, 66);
                  } else if (
                    (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                    pubKey.length === 66
                  ) {
                    return pubKey.slice(2);
                  }
                  return 'Invalid key format';
                } catch {
                  return 'Parse error';
                }
              })()
            }
            onCopy={() => {
              const value =
                pointData?.xCoordinate ||
                (() => {
                  if (!challenge?.public_key) return '';
                  try {
                    const pubKey = challenge.public_key;
                    if (pubKey.startsWith('04') && pubKey.length === 130) {
                      return pubKey.slice(2, 66);
                    } else if (
                      (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                      pubKey.length === 66
                    ) {
                      return pubKey.slice(2);
                    }
                    return '';
                  } catch {
                    return '';
                  }
                })();
              navigator.clipboard.writeText(value);
            }}
          />

          {/* Y Coordinate */}
          <ModalItem
            label="Y Coordinate"
            value={
              pointData?.yCoordinate ||
              (() => {
                if (!challenge?.public_key) return '';
                try {
                  const point = publicKeyToPoint(challenge.public_key);
                  return point.y.toString(16).padStart(64, '0');
                } catch {
                  return 'Parse error';
                }
              })()
            }
            onCopy={() => {
              const value =
                pointData?.yCoordinate ||
                (() => {
                  if (!challenge?.public_key) return '';
                  try {
                    const point = publicKeyToPoint(challenge.public_key);
                    return point.y.toString(16).padStart(64, '0');
                  } catch {
                    return '';
                  }
                })();
              navigator.clipboard.writeText(value);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ModalItem: React.FC<ModalItemProps> = ({ label, value, onCopy, type = 'text' }) => {
  return (
    <div className="modal-item">
      <span className="modal-label">{label}:</span>
      <div className="modal-value-container">
        <input className="modal-value-input" type={type} value={value} readOnly />
        {onCopy && (
          <button className="copy-button" onClick={onCopy}>
            Copy
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal;
