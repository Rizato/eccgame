import React from 'react';
import { useGameStateRedux } from '../hooks/useGameStateRedux';
import ThemeToggle from './ThemeToggle';

interface GameHeaderProps {
  showModeSelector?: boolean;
  showErrorBanner?: boolean;
  onOpenHowToPlay?: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  showModeSelector = false,
  showErrorBanner = false,
  onOpenHowToPlay,
}) => {
  const { gameMode, error, setGameMode, clearError } = useGameStateRedux();

  return (
    <header className="game-header">
      <div className="header-content">
        <h1>ECC Crypto Playground</h1>
        <div className="mode-controls">
          {showModeSelector && (
            <div className="mode-selector">
              <button
                className={`mode-button ${gameMode === 'daily' ? 'active' : ''}`}
                onClick={() => setGameMode('daily')}
              >
                Daily Challenge
              </button>
              <button
                className={`mode-button ${gameMode === 'practice' ? 'active' : ''}`}
                onClick={() => setGameMode('practice')}
              >
                Practice Mode
              </button>
            </div>
          )}
          {onOpenHowToPlay && (
            <button className="how-to-play-button" onClick={onOpenHowToPlay} title="How to Play">
              ?
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
      {showErrorBanner && error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}
    </header>
  );
};

export default GameHeader;
