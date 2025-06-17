import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { switchGameMode } from '../store/slices/gameSlice';
import './HowToPlayModal.css';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleModeClick = (mode: 'daily' | 'practice') => {
    dispatch(switchGameMode(mode));
    navigate(mode === 'practice' ? '/practice' : '/');
    onClose();
  };

  return createPortal(
    <div className="how-to-play-overlay" onClick={onClose}>
      <div className="how-to-play-modal" onClick={e => e.stopPropagation()}>
        <div className="how-to-play-header">
          <button className="how-to-play-close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2 className="how-to-play-title">How to Play?</h2>
          <p className="how-to-play-subtitle">Try your luck at solving the impossible!</p>
        </div>

        <div className="how-to-play-content">
          <section className="how-to-play-section">
            <h3>What is ECC Game?</h3>
            <p>
              ECC Game is a fun way to learn about{' '}
              <strong>Elliptic Curve Cryptography (ECC)</strong> - the mathematics behind Bitcoin
              and cryptocurrency security.
            </p>
            <div className="ecc-basics">
              <h4>Key Concepts:</h4>
              <ul>
                <li>
                  <strong>ECC (Elliptic Curve Cryptography):</strong> A type of public-key
                  cryptography based on the algebraic structure of elliptic curves over finite
                  fields.
                </li>
                <li>
                  <strong>Generator Point (G):</strong> A predetermined point on the secp256k1 curve
                  that serves as the starting point for all operations. All Bitcoin addresses are
                  created by multiplying G by a private key.
                </li>
                <li>
                  <strong>Point Operations:</strong>
                  <ul>
                    <li>
                      <strong>Addition:</strong> Adding two points on the curve to get a third point
                    </li>
                    <li>
                      <strong>Doubling:</strong> Adding a point to itself (P + P = 2P) - a special
                      case of addition
                    </li>
                    <li>
                      <strong>Multiplication:</strong> Adding a point to itself multiple times
                      (scalar multiplication)
                    </li>
                    <li>
                      <strong>Negation:</strong> Finding the point that, when added to the original,
                      equals the point at infinity (flips the Y coordinate)
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>Private Key:</strong> A secret number (scalar) that, when multiplied by G,
                  gives your public key.
                </li>
                <li>
                  <strong>Public Key:</strong> A point on the curve that corresponds to a Bitcoin
                  address.
                </li>
              </ul>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>Using the Calculator</h3>
            <div className="calculator-guide">
              <p>
                The calculator operates on the <strong>current point</strong> shown on the graph.
                You perform point operations to move from it to another point to reveal the private
                key for the wallet. Starting from G or the Wallet, make repeated operations until
                you reveal the private key by creating a sequence of operations that connects the
                two points.
              </p>

              <div className="calc-operations">
                <h4>Quick Operations:</h4>
                <ul>
                  <li>
                    <strong>+1/-1:</strong> Move forward or backward by one step
                  </li>
                  <li>
                    <strong>×2/÷2:</strong> Double or halve your current position
                  </li>
                  <li>
                    <strong>-P (Negation):</strong> Flip the point across the X-axis (negates the Y
                    coordinate)
                  </li>
                  <li>
                    <strong>rand:</strong> Generate a random number between 2 and the curve order
                    for quick experimentation
                  </li>
                </ul>
              </div>

              <div className="calc-workflow">
                <h4>Advanced Operations:</h4>
                <ol>
                  <li>
                    <strong>Enter a number</strong> using the keypad
                  </li>
                  <li>
                    <strong>Select an operation</strong> (+, -, ×, ÷)
                  </li>
                  <li>
                    <strong>Press = or Enter</strong> to execute the operation
                  </li>
                  <li>
                    <strong>Go Here (→):</strong> Jump directly to G × scalar (where scalar is the
                    entered number)
                  </li>
                </ol>

                <h4>Private Key Display:</h4>
                <p>
                  <strong>Click any private key</strong> (in the calculator, challenge info, or
                  modals) to toggle between decimal and hexadecimal display formats. Your preference
                  is saved globally across all components.
                </p>

                <h4>Save Points:</h4>
                <p>
                  <strong>Click the star</strong> to save a point to the graph so you can use it as
                  a reference to jump back to. Click the star again to unsave.
                </p>
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
                    <strong>Current Point:</strong> Your current position
                  </li>
                  <li>
                    <strong>Generator Point (G):</strong> The starting point for all Bitcoin
                    addresses
                  </li>
                  <li>
                    <strong>Wallet Point:</strong> The target you're trying to reach
                  </li>
                  <li>
                    <strong>Saved Points:</strong> Points you've bookmarked for reference
                  </li>
                </ul>

                <div className="graph-note">
                  <strong>Graph Tip:</strong> Points on the graph are approximations due to the
                  challenge of representing 2^256 space on a limited screen.
                </div>
              </div>

              <div className="graph-navigation">
                <h4>Interacting with Points:</h4>
                <ul>
                  <li>
                    <strong>Click any point:</strong> View its details (coordinates, address, etc.)
                  </li>
                  <li>
                    <strong>"Switch here":</strong> Make the clicked point your new current point
                    for calculations
                  </li>
                  <li>
                    <strong>"Copy to Calculator":</strong> Copy the private key (if known) to the
                    calculator display
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="how-to-play-section">
            <h3>Quick Start</h3>
            <div className="quick-guide">
              <ol>
                <li>
                  <strong>Start with Practice Mode</strong> to learn how the tools work.
                </li>
                <li>
                  <strong>Experiment with operations</strong> like multiply, divide, add, subtract,
                  and negate.
                </li>
                <li>
                  <strong>Save interesting points</strong> to create your own landmarks.
                </li>
                <li>
                  <strong>Try Daily Mode</strong> and accept inevitable defeat.
                </li>
                <li>
                  <strong>Share your attempts</strong> and spread the mathematical madness!
                </li>
              </ol>
            </div>
          </section>
          <section className="how-to-play-section">
            <h3>Game Modes</h3>
            <div className="game-modes">
              <div className="mode-item clickable" onClick={() => handleModeClick('daily')}>
                <h3>Daily Mode</h3>
                <p>
                  Test yourself with real Bitcoin wallets. These are basically impossible to solve -
                  that's what makes Bitcoin secure!
                </p>
                <span className="mode-action">Play Daily Mode →</span>
              </div>
              <div className="mode-item clickable" onClick={() => handleModeClick('practice')}>
                <h3>Practice Mode</h3>
                <p>
                  Learn ECC operations with wallets that have known private keys. Perfect for
                  understanding how the math works.
                </p>
                <span className="mode-action">Play Practice Mode →</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default HowToPlayModal;
