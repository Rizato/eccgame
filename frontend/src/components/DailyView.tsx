import React from 'react';
import DailyChallenge from './DailyChallenge';
import GameHeader from './GameHeader';

const DailyView: React.FC = () => {
  return (
    <div className="ecc-game-page">
      <GameHeader showErrorBanner={true} />
      <main className="game-main">
        <DailyChallenge />
      </main>
    </div>
  );
};

export default DailyView;
