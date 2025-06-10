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
              While learning about elliptic curve cryptography, I came to appreciate the
              computational difficulty it presents. No matter what ECC operations you perform, the
              result is always ambiguous. So I built something that lets humans manually play with
              the points and see if human intuition reveals something new. It doesn't, but it's
              still fun to play.
            </p>
          </section>

          <section className="faq-section">
            <h2>Can I actually win Bitcoin from playing?</h2>
            <p>
              No. The targets are real Bitcoin addresses with unspent funds, but the private keys
              are unknown and, for all practical purposes, unrecoverable.
            </p>
            <p>
              The only way to win is to already possess the private key or to have solved the
              elliptic curve discrete logarithm problem. This game won't help you develop such an
              algorithm. A textbook on quantum computing and billions of dollars for R&D would be
              better.
            </p>
          </section>

          <section className="faq-section">
            <h2>Why keep playing if nobody can win?</h2>
            <p>
              Because that's the point. This isn't a game you beat. It's a demonstration of what
              computationally hard problems look like. The visual feedback, the scale of the
              keyspace, and the mathematical terrain show you what you're up against. You're not
              chasing a win, but understanding how ECC protects Bitcoin users' wallets.
            </p>
          </section>

          <section className="faq-section">
            <h2>Is this ethical?</h2>
            <p>
              Yes. The game uses real, unspent Bitcoin addresses to make the stakes tangible, but
              the challenge is computationally infeasible to solve through random guessing. The game
              presents an easy-to-understand ECC point calculator. However, you cannot glean
              anything useful from unknown ECC points. No matter what operations you perform, the
              relationships remain ambiguous. No data returned by the game can assist in recovering
              a private key. This reinforces, rather than weakens, the computational difficulty
              underlying ECC's security.
            </p>
            <p>
              Anyone seriously attempting to solve the discrete logarithm problem wouldn't be
              playing a browser game and manually clicking buttons on a calculator.
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
            <h2>How do you know the solutions?</h2>
            <p>
              I don't. That's the premise of public key cryptography. I know the public keys because
              they're on the Bitcoin blockchain for the whole world to see, and I know the
              deterministic math that generates them. When the calculator executes an operation to
              create a new private key, it produces a specific public key. If the public keys match,
              then the private key has been found.
            </p>
          </section>

          <section className="faq-section">
            <h2>How does it work?</h2>
            <p>
              Behind the scenes, there's a graph where nodes represent public keys and edges
              represent scalar relationships between them. It starts with the generator point G and
              the challenge wallet. Each calculator operation creates a new node and edge based on
              the operation performed. If the previous point had a known private key, the new point
              will too, since we know both the starting point and the operation. Working from G, we
              always know the private key. Working backwards from the challenge wallet, we don't. If
              this graph ever connects G to the challenge wallet, then the challenge's private key
              becomes known.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
