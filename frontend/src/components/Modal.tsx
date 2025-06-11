import React, { type ReactNode, useState } from 'react';
import { createPortal } from 'react-dom';
import { publicKeyToPoint } from '../utils/ecc';
import type { Challenge } from '../types/game';
import type { ECPoint } from '../types/ecc';
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
  };
  // Point loading operations
  point: ECPoint | null;
  onLoadPoint?: (point: ECPoint) => void;
  // Calculator integration
  onCopyPrivateKeyToCalculator?: (privateKey: string) => void;
}

interface ModalItemProps {
  label: string;
  value: string;
  onCopy?: () => void;
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
  point,
  onLoadPoint,
  onCopyPrivateKeyToCalculator,
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

          {/* Private Key (Practice Mode or when calculated) */}
          {((isPracticeMode && practicePrivateKey) || pointData?.privateKey) && (
            <div className="modal-item">
              <span className="modal-label">Private Key:</span>
              <div className="modal-value-container">
                <span
                  className="modal-value-display clickable"
                  onClick={() => setPrivateKeyHexMode(!privateKeyHexMode)}
                  title={
                    privateKeyHexMode ? 'Click to switch to decimal' : 'Click to switch to hex'
                  }
                >
                  {(() => {
                    const keyToUse = pointData?.privateKey || practicePrivateKey;
                    if (!keyToUse) return '';

                    try {
                      const keyBigInt = BigInt('0x' + keyToUse);
                      return privateKeyHexMode
                        ? '0x' + keyBigInt.toString(16)
                        : keyBigInt.toString();
                    } catch {
                      return 'Invalid key';
                    }
                  })()}
                </span>
                <button
                  className="copy-button"
                  onClick={() => {
                    const keyToUse = pointData?.privateKey || practicePrivateKey;
                    if (!keyToUse) return;

                    try {
                      const keyBigInt = BigInt('0x' + keyToUse);
                      navigator.clipboard.writeText(
                        privateKeyHexMode ? '0x' + keyBigInt.toString(16) : keyBigInt.toString()
                      );
                    } catch {
                      // Handle invalid key
                    }
                  }}
                >
                  Copy
                </button>
                {onCopyPrivateKeyToCalculator && (
                  <button
                    className="copy-button primary"
                    onClick={() => {
                      const keyToUse = pointData?.privateKey || practicePrivateKey;
                      if (!keyToUse) return;

                      try {
                        const keyBigInt = BigInt('0x' + keyToUse);
                        const keyValue = privateKeyHexMode
                          ? '0x' + keyBigInt.toString(16)
                          : keyBigInt.toString();
                        onCopyPrivateKeyToCalculator(keyValue);
                        onClose();
                      } catch {
                        // Handle invalid key
                      }
                    }}
                  >
                    Copy to Calculator
                  </button>
                )}
              </div>
            </div>
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

          {/* Action Buttons */}
          <div className="modal-actions">
            {/* Set as Current Point button for all points */}
            {onLoadPoint && point && (
              <button
                className="action-button primary"
                onClick={() => {
                  onLoadPoint(point);
                  onClose();
                }}
              >
                Set as Current Point
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const ModalItem: React.FC<ModalItemProps> = ({ label, value, onCopy }) => {
  return (
    <div className="modal-item">
      <span className="modal-label">{label}:</span>
      <div className="modal-value-container">
        <span className="modal-value-display" title="Click to select text">
          {value}
        </span>
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
