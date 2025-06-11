import React from 'react';
import DailyChallenge from './DailyChallenge';
import GameHeader from './GameHeader';

interface DailyViewProps {
  onOpenHowToPlay?: () => void;
}

const DailyView: React.FC<DailyViewProps> = ({ onOpenHowToPlay }) => {
  return (
    <div className="ecc-game-page">
      <GameHeader showErrorBanner={true} onOpenHowToPlay={onOpenHowToPlay} />
      <main className="game-main">
        <DailyChallenge />
      </main>
    </div>
  );
};

export default DailyView;
