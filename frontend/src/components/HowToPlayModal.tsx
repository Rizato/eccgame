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
            <h3>Gameplay</h3>
            <p>
              Find the private key for a Bitcoin wallet using only its public key. Too bad it's
              impossible.
            </p>
            <div className="game-modes">
              <div className="mode-item">
                <h3>Daily Mode</h3>
                <p>Real Bitcoin wallets. No matter how hard you try, you will never solve them.</p>
              </div>
              <div className="mode-item">
                <h3>Practice Mode</h3>
                <p>Learn ECC operations with a wallet that has a known private key.</p>
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>Using the Calculator</h3>
            <div className="calculator-guide">
              <div className="calc-operations">
                <h4>Basic Operations:</h4>
                <ul>
                  <li>
                    <strong>Add/Subtract:</strong> Combine different points using scalar values
                  </li>
                  <li>
                    <strong>Multiply/Divide:</strong> <code>× 2</code>, <code>× 1000</code> - Jump
                    to different points on the curve
                  </li>
                </ul>
              </div>

              <div className="calc-workflow">
                <h4>How to Use:</h4>
                <ol>
                  <li>
                    <strong>Connect G with the Wallet</strong> using calculator operations
                  </li>
                  <li>
                    <strong>Use quick operators (+1, -1, ×2, ÷2)</strong> to explore the curve
                    quickly
                  </li>
                  <li>
                    <strong>Use the numpad</strong> to perform any operation you want
                  </li>
                </ol>
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>Reading the Graph</h3>
            <div className="graph-guide">
              <div className="graph-elements">
                <h4>What You See:</h4>
                <ul>
                  <li>
                    <strong>Current Point:</strong> Your current position (highlighted)
                  </li>
                  <li>
                    <strong>Generator Point:</strong> The SECP256K1 generator point (G)
                  </li>
                  <li>
                    <strong>Wallet Point:</strong> The wallet you need to solve
                  </li>
                  <li>
                    <strong>Saved Points:</strong> Points you've bookmarked
                  </li>
                </ul>
              </div>

              <div className="graph-navigation">
                <h4>Graph Controls:</h4>
                <ul>
                  <li>
                    <strong>Click Points:</strong> See coordinates and details
                  </li>
                  <li>
                    <strong>Use as current point:</strong> Start calculating from a saved point
                  </li>
                  <li>
                    <strong>Copy to Calculator:</strong> Enter a the scalar for a known point into
                    the calculator display
                  </li>
                </ul>
              </div>

              <div className="tip-box">
                <strong>Graph Tip:</strong> Points on the graph are approximations due to the
                challenge of representing 2^256 space on a limited screen
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>Quick Start</h3>
            <div className="quick-guide">
              <ol>
                <li>
                  <strong>Start with Practice Mode</strong> to learn how the tools work
                </li>
                <li>
                  <strong>Experiment with operations</strong> like multiply, divide, add, and
                  subtract
                </li>
                <li>
                  <strong>Save interesting points</strong> to create your own landmarks
                </li>
                <li>
                  <strong>Try the Daily Challenge</strong> and accept inevitable defeat
                </li>
                <li>
                  <strong>Share your attempts</strong> and spread the mathematical madness
                </li>
              </ol>
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
