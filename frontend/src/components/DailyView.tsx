import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import DailyChallenge from './DailyChallenge';
import ErrorState from './ErrorState';
import GameHeader from './GameHeader';
import LoadingState from './LoadingState';

interface DailyViewProps {
  onOpenHowToPlay?: () => void;
}

const DailyView: React.FC<DailyViewProps> = ({ onOpenHowToPlay }) => {
  const { loading, challenge } = useGameStateRedux();

  return (
    <div className="ecc-game-page">
      <GameHeader
        showModeSelector={true}
        showErrorBanner={true}
        onOpenHowToPlay={onOpenHowToPlay}
      />
      <main className="game-main">
        {loading && <LoadingState />}
        {!loading && !challenge && <ErrorState />}
        {!loading && challenge && <DailyChallenge />}
      </main>
    </div>
  );
};

export default DailyView;
