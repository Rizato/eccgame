import React from 'react';
import GameHeader from './GameHeader';
import PracticeMode from './PracticeMode';

const PracticeModeView: React.FC = () => {
  return (
    <div className="ecc-game-page">
      <GameHeader showModeSelector={true} />
      <main className="game-main">
        <PracticeMode />
      </main>
    </div>
  );
};

export default PracticeModeView;
