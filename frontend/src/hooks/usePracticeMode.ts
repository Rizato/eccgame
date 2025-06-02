import { useState, useCallback } from 'react';
import type { Challenge } from '../types/api';
import {
  generateRandomScalar,
  pointMultiply,
  getGeneratorPoint,
  pointToPublicKey,
  bigintToHex,
} from '../utils/ecc';
import { getP2PKHAddress } from '../utils/crypto';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface PracticeModeState {
  practicePrivateKey: string;
  practiceChallenge: Challenge | null;
  difficulty: Difficulty;
  isGenerating: boolean;
}

interface PracticeModeActions {
  setDifficulty: (difficulty: Difficulty) => void;
  generatePracticeChallenge: () => Promise<void>;
}

export function usePracticeMode(): PracticeModeState & PracticeModeActions {
  const [practicePrivateKey, setPracticePrivateKey] = useState<string>('');
  const [practiceChallenge, setPracticeChallenge] = useState<Challenge | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePracticeChallenge = useCallback(async () => {
    setIsGenerating(true);

    try {
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
        metadata: [
          {
            tag: 'difficulty',
            description: difficulty,
          },
          {
            tag: 'range',
            description:
              difficulty === 'easy' ? '1-100' : difficulty === 'medium' ? '1-1M' : 'full',
          },
        ],
        explorer_link: '',
        active: true,
        active_date: new Date().toISOString(),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [difficulty]);

  return {
    // State
    practicePrivateKey,
    practiceChallenge,
    difficulty,
    isGenerating,
    // Actions
    setDifficulty,
    generatePracticeChallenge,
  };
}
