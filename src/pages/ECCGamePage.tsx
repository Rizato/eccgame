import React, { useEffect } from 'react';
import DailyView from '../components/DailyView';
import GameFooter from '../components/GameFooter';
import HowToPlayModal from '../components/HowToPlayModal';
import PracticeModeView from '../components/PracticeModeView';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { switchGameMode, setError } from '../store/slices/gameSlice';
import { openHowToPlay, closeHowToPlay, setShowHowToPlay } from '../store/slices/uiSlice';
import './ECCGamePage.css';

interface ECCGamePageProps {
  mode?: 'daily' | 'practice';
}

const ECCGamePage: React.FC<ECCGamePageProps> = ({ mode = 'daily' }) => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const { showHowToPlay, hasSeenHowToPlay } = useAppSelector(state => state.ui);

  // Set game mode based on route
  useEffect(() => {
    dispatch(switchGameMode(mode));
  }, [dispatch, mode]);

  // Show startup warnings and how to play modal for first-time users
  useEffect(() => {
    // Only show how to play modal if user hasn't seen it before
    if (!hasSeenHowToPlay) {
      dispatch(setShowHowToPlay(true));
    }
    // Always show private key warning on startup
    dispatch(setError('⚠️ Never enter the private keys from your actual Bitcoin wallets'));
  }, [dispatch, hasSeenHowToPlay]);

  const handleCloseHowToPlay = () => {
    dispatch(closeHowToPlay());
  };

  const handleOpenHowToPlay = () => {
    dispatch(openHowToPlay());
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
