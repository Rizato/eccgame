import React, { useEffect, useState } from 'react';
import DailyView from '../components/DailyView';
import GameFooter from '../components/GameFooter';
import HowToPlayModal from '../components/HowToPlayModal';
import PracticeModeView from '../components/PracticeModeView';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setGameMode, setError } from '../store/slices/gameSlice';
import './ECCGamePage.css';

interface ECCGamePageProps {
  mode?: 'daily' | 'practice';
}

const ECCGamePage: React.FC<ECCGamePageProps> = ({ mode = 'daily' }) => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Set game mode based on route
  useEffect(() => {
    dispatch(setGameMode(mode));
  }, [dispatch, mode]);

  // Show startup warnings and how to play modal for first-time users
  useEffect(() => {
    setShowHowToPlay(true);
    // Always show private key warning on startup
    dispatch(setError('⚠️ Never enter the private keys from your actual Bitcoin wallets'));
  }, [dispatch]);

  const handleCloseHowToPlay = () => {
    setShowHowToPlay(false);
  };

  const handleOpenHowToPlay = () => {
    setShowHowToPlay(true);
  };

  return (
    <div className="ecc-game-page-wrapper">
      {gameMode === 'practice' ? (
        <PracticeModeView onOpenHowToPlay={handleOpenHowToPlay} />
      ) : (
        <DailyView onOpenHowToPlay={handleOpenHowToPlay} />
      )}

      <HowToPlayModal isOpen={showHowToPlay} onClose={handleCloseHowToPlay} />
      <GameFooter />
    </div>
  );
};

export default ECCGamePage;
