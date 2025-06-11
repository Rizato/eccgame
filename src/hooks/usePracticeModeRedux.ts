import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setDifficulty,
  setPracticePrivateKey,
  setPracticeChallenge,
  generatePracticeChallenge,
  type Difficulty,
} from '../store/slices/practiceModeSlice';
import type { Challenge } from '../types/game';

export function usePracticeModeRedux() {
  const dispatch = useAppDispatch();
  const practiceModeState = useAppSelector(state => state.practiceMode);

  return {
    // State
    practicePrivateKey: practiceModeState.practicePrivateKey,
    practiceChallenge: practiceModeState.practiceChallenge,
    difficulty: practiceModeState.difficulty,
    isGenerating: practiceModeState.isGenerating,
    // Actions
    setDifficulty: (difficulty: Difficulty) => dispatch(setDifficulty(difficulty)),
    setPracticePrivateKey: (privateKey: string) => dispatch(setPracticePrivateKey(privateKey)),
    setPracticeChallenge: (challenge: Challenge | null) =>
      dispatch(setPracticeChallenge(challenge)),
    generatePracticeChallenge: () =>
      dispatch(generatePracticeChallenge(practiceModeState.difficulty)),
  };
}
