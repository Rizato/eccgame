import React from 'react';
import { Link } from 'react-router-dom';
import './FAQPage.css';

const FAQPage: React.FC = () => {
  return (
    <div className="faq-page">
      <div className="faq-container">
        <header className="faq-header">
          <Link to="/" className="back-link">
            ← Back to Game
          </Link>
          <h1>Frequently Asked Questions</h1>
        </header>

        <div className="faq-content">
          <section className="faq-section">
            <h2>Why does this exist?</h2>
            <p>
              While digging into elliptic curve cryptography (ECC) during some downtime, I came to
              fully appreciate how unbreakable it is under classical computing. So I built something
              to make that reality tangible. This project is a thought experiment you can poke at.
              It's a treasure hunt with no map, a lottery with no odds, and a challenge you cannot
              beat. That's the appeal.
            </p>
          </section>

          <section className="faq-section">
            <h2>Can I actually win Bitcoin from playing?</h2>
            <p>
              No. The targets are real Bitcoin addresses with unspent funds, but the private keys
              are unknown and, for all practical purposes, unrecoverable. The only way to win is to
              already possess the private key. The game doesn't help you find it.
            </p>
          </section>

          <section className="faq-section">
            <h2>How do you know the answers?</h2>
            <p>
              I don't. That's the premise of public key cryptography. I know the public keys because
              they're public, and I know the deterministic math that generates them. When someone
              enters a private key, it produces a matching public key. If that matches the target,
              and the submitted signature verifies, the server can confirm it. The private key never
              leaves the client.
            </p>
          </section>

          <section className="faq-section">
            <h2>Are the private keys sent to your server?</h2>
            <p>
              No. Your private key is used only on your device to sign a message that includes your
              public key, the current day, and your anonymous session ID. Only the public key and
              signature are sent. The session ID is discarded immediately after validation. No
              private key material is transmitted or stored.
            </p>
          </section>

          <section className="faq-section">
            <h2>Is this ethical?</h2>
            <p>
              Yes. The game uses real, unspent Bitcoin addresses to make the stakes tangible. But
              the challenge is mathematically impossible to solve through guessing. Feedback is
              intentionally ambiguous. Graphs don't reveal anything actionable. No data the game
              returns can assist in recovering a key. This reinforces, rather than weakens, the
              reality of ECC's security.
            </p>
          </section>

          <section className="faq-section">
            <h2>Why real Bitcoin addresses?</h2>
            <p>
              Because theoretical stakes aren't enough to make the point. These are real addresses
              with known, public balances. They've never moved and are widely recognized in the
              Bitcoin ecosystem. Using them turns the exercise from abstract number games into a
              visible test of real-world cryptography. No claims are made about control or
              ownership.
            </p>
          </section>

          <section className="faq-section">
            <h2>Why keep playing if nobody can win?</h2>
            <p>
              Because that's the point. This isn't a game you beat. It's a demonstration of what
              unbreakable security looks like. The visual feedback, the scale of the keyspace, and
              the mathematical terrain are here to show you what you're up against. You're not
              chasing a win. You're exploring a system that doesn't bend.
            </p>
          </section>

          <section className="faq-section">
            <h2>What is the server actually verifying?</h2>
            <p>
              To ensure fairness and prevent guess replays, the client signs a hash of their public
              key, the day's challenge identifier, and their temporary session ID. The server checks
              this signature against the submitted public key. This proves the player holds the
              private key, and prevents people from copying or replaying shared valid submissions.
              The session ID is discarded after use and never logged or linked to identity.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
