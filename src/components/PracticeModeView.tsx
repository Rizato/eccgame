import React from 'react';
import GameHeader from './GameHeader';
import PracticeMode from './PracticeMode';

interface PracticeModeViewProps {
  onOpenHowToPlay?: () => void;
}

const PracticeModeView: React.FC<PracticeModeViewProps> = ({ onOpenHowToPlay }) => {
  return (
    <div className="ecc-game-page">
      <GameHeader onOpenHowToPlay={onOpenHowToPlay} />
      <main className="game-main">
        <PracticeMode />
      </main>
    </div>
  );
};

export default PracticeModeView;
