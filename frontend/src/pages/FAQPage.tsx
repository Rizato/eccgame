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
              are unknown and, for all practical purposes, unrecoverable.
            </p>
            <p>
              The only way to win is to already possess the private key, or to have broken ECC. This
              game does not help someone to develop the algorithm, a textbook would be better, and I
              don't posses any of the keys.
            </p>
          </section>

          <section className="faq-section">
            <h2>Is this ethical?</h2>
            <p>
              Yes. The game uses real, unspent Bitcoin addresses to make the stakes tangible. But
              the challenge is impossible to solve through random guessing. The game just presents
              an easy to understand ECC point manipulating calculator. However, you cannot glean
              anything from one unknown ECC point, and no matter the operations to modify it, what
              it is is always ambiguous. No data the game returns can assist in recovering a key.
              This reinforces, rather than weakens, the reality of ECC's security.
            </p>
            <p>
              Anyone who is seriously trying to crack SECP256K1 is not going to be playing a game at
              human speeds.
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
              they're on the bitcoin blockchain, public for the whole world, and I know the
              deterministic math that generates them. When private key, it produces public key. If
              the public keys match, then the private key has been found.
            </p>
          </section>

          <section className="faq-section">
            <h2>How does it work?</h2>
            <p>
              Behind the scenes there is a graph (data structure, not visual) where the nodes are
              points representing public keys, and the edges are the scalar value between them. It
              starts with just the generator point G, and the challenge wallet. On each calculator
              operation, and new node is created, and a new edge from the previous point to the new
              point based on the calculator operation. If the previous point had a known
              scalar/private key, then the new point will as well, because we know the start and the
              operation. So when working from G, we always know the scalar/private key. When working
              backwards from the challenge wallet, we do not know the scalar/private key. If this
              graph ever has a complete connection from G to the challenge wallet, then the
              scalar/private key for the challenge is known.
            </p>
            <p>
              However, due to the performance in browswer for testing connectivity, operations are
              bundled into single nodes and edges when saved.
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
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
