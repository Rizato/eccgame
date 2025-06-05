import React from 'react';
import GameHeader from './GameHeader';
import PracticeMode from './PracticeMode';

interface PracticeModeViewProps {
  onOpenHowToPlay?: () => void;
}

const PracticeModeView: React.FC<PracticeModeViewProps> = ({ onOpenHowToPlay }) => {
  return (
    <div className="ecc-game-page">
      <GameHeader showModeSelector={true} onOpenHowToPlay={onOpenHowToPlay} />
      <main className="game-main">
        <PracticeMode />
      </main>
    </div>
  );
};

export default PracticeModeView;
