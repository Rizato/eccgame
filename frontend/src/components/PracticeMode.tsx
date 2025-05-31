import React, { useState, useEffect } from 'react';
import ECCPlayground from './ECCPlayground';
import ChallengeInfo from './ChallengeInfo';
import {
  generateRandomScalar,
  pointMultiply,
  getGeneratorPoint,
  pointToPublicKey,
  bigintToHex,
} from '../utils/ecc';
import { getP2PKHAddress } from '../utils/crypto';
import type { Challenge } from '../types/api';
import './PracticeMode.css';

const PracticeMode: React.FC = () => {
  const [practicePrivateKey, setPracticePrivateKey] = useState<string>('');
  const [practiceChallenge, setPracticeChallenge] = useState<Challenge | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');

  // Generate a new practice challenge
  const generatePracticeChallenge = async () => {
    let privateKey: bigint;

    switch (difficulty) {
      case 'easy':
        // Small private key (1-100)
        privateKey = BigInt(Math.floor(Math.random() * 100) + 1);
        break;
      case 'medium':
        // Medium private key (up to 2^20)
        privateKey = BigInt(Math.floor(Math.random() * 1048576) + 1);
        break;
      case 'hard':
        // Large private key (full range)
        privateKey = generateRandomScalar();
        break;
    }

    const privateKeyHex = bigintToHex(privateKey);
    const generatorPoint = getGeneratorPoint();
    const publicKeyPoint = pointMultiply(privateKey, generatorPoint);
    const publicKeyHex = pointToPublicKey(publicKeyPoint);

    // Generate the P2PKH address
    const p2pkhAddress = await getP2PKHAddress(publicKeyHex);

    setPracticePrivateKey(privateKeyHex);
    setPracticeChallenge({
      uuid: 'practice-challenge',
      public_key: publicKeyHex,
      p2pkh_address: p2pkhAddress,
      created_at: new Date().toISOString(),
      metadata: [],
      explorer_link: '',
      active: true,
      active_date: new Date().toISOString(),
    });
  };

  // Initialize with first challenge
  useEffect(() => {
    generatePracticeChallenge();
  }, [difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSolve = async (submittedPrivateKey: string) => {
    if (submittedPrivateKey === practicePrivateKey) {
      alert('🎉 Congratulations! You solved the practice challenge!');
    } else {
      alert("❌ That's not quite right. Keep trying!");
    }
  };

  if (!practiceChallenge) {
    return (
      <div className="practice-mode">
        <div className="loading">Generating practice challenge...</div>
      </div>
    );
  }

  return (
    <>
      <div className="challenge-info-row">
        <div className="challenge-info-card">
          <ChallengeInfo
            challenge={practiceChallenge}
            isPracticeMode={true}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            onNewChallenge={generatePracticeChallenge}
            practicePrivateKey={practicePrivateKey}
          />
        </div>
      </div>

      <div className="playground-container">
        <ECCPlayground
          challenge={practiceChallenge}
          onSolve={handleSolve}
          isPracticeMode={true}
          practicePrivateKey={practicePrivateKey}
        />
      </div>
    </>
  );
};

export default PracticeMode;
