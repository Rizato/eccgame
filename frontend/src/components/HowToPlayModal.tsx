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
          <h2 className="how-to-play-title">How to Use ECC Crypto Playground</h2>
          <p className="how-to-play-subtitle">Try your luck at solving the impossible!</p>
        </div>

        <div className="how-to-play-content">
          <section className="how-to-play-section">
            <h3>Daily Challenges</h3>
            <p>
              Every day, we present you with an Bitcoin wallet address that mined a block during the
              50 bitcoin block reward, but has never spent it (with some exceptions for notable
              Satoshi addresses).
            </p>

            <p>
              Your challenge is to find the private key for the wallet from the public key using an
              elliptic curve cryptography (ECC) calculator.
            </p>

            <p>
              The game is quite literally impossible, and the only way to win is to already have the
              private key. If you have struggled to grasp the reality of how large 2^256 really is,
              this game will help you.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>Game Modes</h3>
            <div className="game-modes">
              <div className="mode-item">
                <h4>Daily Challenge</h4>
                <p>
                  The main challenge - a new cryptographic puzzle every day. Find the private key to
                  win, but that isn't ever going to happen.
                </p>
              </div>
              <div className="mode-item">
                <h4>Practice Mode</h4>

                <p>
                  Practice mode gives you private key ahead of time, so you can understand how the
                  operations work, and devise a strategy to use in the{' '}
                  <strong>Daily Challenge</strong>.
                </p>
                <p>Plus, it lets you actually get a win, which feels nice.</p>
              </div>
            </div>
            <div className="tip-box">
              <strong>💡 Pro tip:</strong> Try hard mode in Practice and invert the{' '}
              <a href="https://en.wikipedia.org/wiki/Elliptic_curve_point_multiplication#Double-and-add">
                double and add
              </a>{' '}
              algorithm to really see how impossible this is.
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>The ECC Calculator</h3>
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
            <h3>Save Points</h3>
            <p>
              Click the <strong>save button (☆)</strong> to save interesting points during your
              exploration. You can load these saved points later to continue from where you left
              off.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>Winning & Sharing</h3>
            <p>
              If you already have the private key, and for some reason put it into this site like a
              psychopath, you will see:
            </p>
            <ul>
              <li>The number of operations to solver</li>
              <li>The challenge wallet address</li>
              <li>The discovered private key</li>
              <li>
                A <strong>share button</strong> to celebrate your achievement
              </li>
            </ul>
            <p>
              <strong>Share your wins!</strong> Help spread the word about ECC Crypto Playground and
              challenge your friends to solve it in fewer steps.
            </p>
          </section>

          <section className="how-to-play-section">
            <h3>Throwing in the towel</h3>
            <p>
              When you have hit that moment of clarity where you realize this is impossible, hit the{' '}
              <strong> "Give Up"</strong> button. It will let you share the word about ECC Crypto
              Playground, and your failures.
            </p>
            <div className="tip-box">
              <strong>💡 Pro tip:</strong> Sharing your attempts helps others discover ECC Crypto
              Playground to waste their time too!
            </div>
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
