import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Challenge } from '../types/api';
import './ChallengeInfo.css';

interface ChallengeInfoProps {
  challenge: Challenge;
}

const ChallengeInfo: React.FC<ChallengeInfoProps> = ({ challenge }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  return (
    <>
      <div className="challenge-info-container">
        <div className="challenge-header"></div>

        <div className="challenge-info-content">
          <div className="info-section">
            <h4 className="address-heading">Target Address</h4>
            <div className="address-row">
              <code className="address-code">{challenge.p2pkh_address}</code>
              {challenge.explorer_link && (
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

          {challenge.metadata && challenge.metadata.length > 0 && (
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

      {showDetailsModal &&
        createPortal(
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="challenge-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Challenge Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="modal-close">
                  ×
                </button>
              </div>
              <div className="modal-content">
                <div className="modal-item">
                  <span className="modal-label">Address:</span>
                  <div className="modal-value-container">
                    <input className="modal-value-input" value={challenge.p2pkh_address} readOnly />
                    <button
                      className="copy-button"
                      onClick={() => navigator.clipboard.writeText(challenge.p2pkh_address)}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="modal-item">
                  <span className="modal-label">Compressed Key:</span>
                  <div className="modal-value-container">
                    <input
                      className="modal-value-input"
                      value={(() => {
                        try {
                          const pubKey = challenge.public_key;
                          // If already compressed, return as-is
                          if (
                            (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                            pubKey.length === 66
                          ) {
                            return pubKey;
                          }
                          // If uncompressed, convert to compressed
                          else if (pubKey.startsWith('04') && pubKey.length === 130) {
                            const x = pubKey.slice(2, 66);
                            const y = pubKey.slice(66);
                            // Check if Y coordinate is even or odd
                            const yBigInt = BigInt('0x' + y);
                            const prefix = yBigInt % 2n === 0n ? '02' : '03';
                            return prefix + x;
                          }
                          return 'Invalid key format';
                        } catch {
                          return 'Parse error';
                        }
                      })()}
                      readOnly
                    />
                    <button
                      className="copy-button"
                      onClick={() => {
                        try {
                          const pubKey = challenge.public_key;
                          let compressedKey = '';
                          if (
                            (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                            pubKey.length === 66
                          ) {
                            compressedKey = pubKey;
                          } else if (pubKey.startsWith('04') && pubKey.length === 130) {
                            const x = pubKey.slice(2, 66);
                            const y = pubKey.slice(66);
                            const yBigInt = BigInt('0x' + y);
                            const prefix = yBigInt % 2n === 0n ? '02' : '03';
                            compressedKey = prefix + x;
                          }
                          navigator.clipboard.writeText(compressedKey);
                        } catch {}
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="modal-item">
                  <span className="modal-label">X Coordinate:</span>
                  <div className="modal-value-container">
                    <input
                      className="modal-value-input"
                      value={(() => {
                        try {
                          const pubKey = challenge.public_key;
                          // Uncompressed key: 04 + X (32 bytes) + Y (32 bytes) = 65 bytes total
                          if (pubKey.startsWith('04') && pubKey.length === 130) {
                            return pubKey.slice(2, 66); // X coordinate: bytes 1-32 (chars 2-65)
                          }
                          // Compressed key: 02/03 + X (32 bytes) = 33 bytes total
                          else if (
                            (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                            pubKey.length === 66
                          ) {
                            return pubKey.slice(2); // X coordinate: bytes 1-32 (chars 2-65)
                          }
                          return 'Invalid key format';
                        } catch {
                          return 'Parse error';
                        }
                      })()}
                      readOnly
                    />
                    <button
                      className="copy-button"
                      onClick={() => {
                        try {
                          const pubKey = challenge.public_key;
                          let x = '';
                          if (pubKey.startsWith('04') && pubKey.length === 130) {
                            x = pubKey.slice(2, 66);
                          } else if (
                            (pubKey.startsWith('02') || pubKey.startsWith('03')) &&
                            pubKey.length === 66
                          ) {
                            x = pubKey.slice(2);
                          }
                          navigator.clipboard.writeText(x);
                        } catch {}
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="modal-item">
                  <span className="modal-label">Y Coordinate:</span>
                  <div className="modal-value-container">
                    <input
                      className="modal-value-input"
                      value={(() => {
                        try {
                          const pubKey = challenge.public_key;
                          // Uncompressed key: 04 + X (32 bytes) + Y (32 bytes) = 65 bytes total
                          if (pubKey.startsWith('04') && pubKey.length === 130) {
                            return pubKey.slice(66); // Y coordinate: bytes 33-64 (chars 66-129)
                          }
                          // Compressed key: 02/03 + X (32 bytes) = 33 bytes total
                          else if (pubKey.startsWith('02') && pubKey.length === 66) {
                            return 'Even (02 prefix)';
                          } else if (pubKey.startsWith('03') && pubKey.length === 66) {
                            return 'Odd (03 prefix)';
                          }
                          return 'Invalid key format';
                        } catch {
                          return 'Parse error';
                        }
                      })()}
                      readOnly
                    />
                    <button
                      className="copy-button"
                      onClick={() => {
                        try {
                          const pubKey = challenge.public_key;
                          let y = '';
                          if (pubKey.startsWith('04') && pubKey.length === 130) {
                            y = pubKey.slice(66);
                          } else if (pubKey.startsWith('02') && pubKey.length === 66) {
                            y = 'Even (02 prefix)';
                          } else if (pubKey.startsWith('03') && pubKey.length === 66) {
                            y = 'Odd (03 prefix)';
                          }
                          navigator.clipboard.writeText(y);
                        } catch {}
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ChallengeInfo;
