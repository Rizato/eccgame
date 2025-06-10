import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import DailyChallenge from './DailyChallenge';
import ErrorState from './ErrorState';
import GameHeader from './GameHeader';
import PlaceholderLayout from './PlaceholderLayout';

interface DailyViewProps {
  onOpenHowToPlay?: () => void;
}

const DailyView: React.FC<DailyViewProps> = ({ onOpenHowToPlay }) => {
  const { loading, challenge } = useGameStateRedux();

  return (
    <div className="ecc-game-page">
      <GameHeader showErrorBanner={true} onOpenHowToPlay={onOpenHowToPlay} />
      <main className="game-main">
        {loading && (
          <PlaceholderLayout message="Loading today's challenge..." isPracticeMode={false} />
        )}
        {!loading && !challenge && <ErrorState />}
        {!loading && challenge && <DailyChallenge />}
      </main>
    </div>
  );
};

export default DailyView;
