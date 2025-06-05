import React from 'react';
import { createPortal } from 'react-dom';
import './HowToPlayModal.css';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="how-to-play-overlay" onClick={onClose}>
      <div className="how-to-play-modal" onClick={e => e.stopPropagation()}>
        <div className="how-to-play-header">
          <button className="how-to-play-close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2 className="how-to-play-title">How to Play Crypto Guesser</h2>
          <p className="how-to-play-subtitle">
            Master the ECC calculator and crack cryptographic challenges!
          </p>
        </div>

        <div className="how-to-play-content">
          <section className="how-to-play-section">
            <h3>🎯 Your Mission</h3>
            <p>
              Every day, we present you with a Bitcoin wallet address. Your challenge is to find the
              private key that controls this wallet using elliptic curve cryptography (ECC)
              operations.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>🧮 The ECC Calculator</h3>
            <p>
              You have access to a powerful ECC calculator that can perform unlimited operations:
            </p>
            <ul>
              <li>
                <strong>Multiply:</strong> Multiply your current point by any number (e.g., × 2, ×
                1000)
              </li>
              <li>
                <strong>Divide:</strong> Divide your current point by any number (e.g., ÷ 2, ÷ 7)
              </li>
              <li>
                <strong>Add:</strong> Add another point to your current point
              </li>
              <li>
                <strong>Subtract:</strong> Subtract another point from your current point
              </li>
            </ul>
            <div className="visual-example">
              <h4>Example Operations:</h4>
              <div className="operation-examples">
                <div className="example-item">
                  <code>G × 2</code> → <span>Point at 2G</span>
                </div>
                <div className="example-item">
                  <code>2G × 5</code> → <span>Point at 10G</span>
                </div>
                <div className="example-item">
                  <code>10G ÷ 2</code> → <span>Back to 5G</span>
                </div>
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>💾 Save Points</h3>
            <p>
              Click the <strong>save button (☆)</strong> to save interesting points during your
              exploration. You can load these saved points later to continue from where you left
              off.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>🎮 Game Modes</h3>
            <div className="game-modes">
              <div className="mode-item">
                <h4>Daily Challenge</h4>
                <p>
                  The main challenge - a new cryptographic puzzle every day. Find the private key to
                  win and share your victory with friends!
                </p>
              </div>
              <div className="mode-item">
                <h4>Practice Mode</h4>
                <p>
                  Perfect your skills with unlimited practice challenges. The private key is shown
                  so you can verify your solution.
                </p>
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>🤷 Giving Up</h3>
            <p>
              Stuck on the daily challenge? After making several attempts, you can click the red
              <strong> "I Give Up"</strong> button. This will:
            </p>
            <ul>
              <li>End your current attempt</li>
              <li>Show you the challenge summary</li>
              <li>
                Let you <strong>share your progress</strong> with friends
              </li>
            </ul>
            <div className="tip-box">
              <strong>💡 Pro tip:</strong> Sharing your attempts helps others discover Crypto
              Guesser and creates friendly competition!
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>🏆 Winning & Sharing</h3>
            <p>When you successfully find the private key, you'll see a victory screen with:</p>
            <ul>
              <li>Your total number of operations</li>
              <li>The challenge wallet address</li>
              <li>The discovered private key</li>
              <li>
                A <strong>share button</strong> to celebrate your achievement
              </li>
            </ul>
            <p>
              <strong>Share your wins!</strong> Help spread the word about Crypto Guesser and
              challenge your friends to beat your operation count.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>🔧 Tips for Success</h3>
            <ul>
              <li>Start with small operations to understand the patterns</li>
              <li>Use the save feature liberally to mark interesting discoveries</li>
              <li>Practice mode is perfect for learning without pressure</li>
              <li>The graph visualization shows your path through the elliptic curve</li>
              <li>Remember: every operation is reversible, so you can always backtrack</li>
            </ul>
          </section>
        </div>

        <div className="how-to-play-footer">
          <button onClick={onClose} className="how-to-play-got-it-button">
            Got it! Let's Play
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HowToPlayModal;
