import React, { useEffect, useState } from 'react';
import DailyView from '../components/DailyView';
import HowToPlayModal from '../components/HowToPlayModal';
import PracticeModeView from '../components/PracticeModeView';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setGameMode } from '../store/slices/gameSlice';
import { storageUtils } from '../utils/storage';
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

  // Check if this is the user's first visit
  useEffect(() => {
    if (storageUtils.isFirstVisit()) {
      setShowHowToPlay(true);
    }
  }, []);

  const handleCloseHowToPlay = () => {
    setShowHowToPlay(false);
    storageUtils.markFirstVisitComplete();
  };

  const handleOpenHowToPlay = () => {
    setShowHowToPlay(true);
  };

  return (
    <>
      {gameMode === 'practice' ? (
        <PracticeModeView onOpenHowToPlay={handleOpenHowToPlay} />
      ) : (
        <DailyView onOpenHowToPlay={handleOpenHowToPlay} />
      )}

      <HowToPlayModal isOpen={showHowToPlay} onClose={handleCloseHowToPlay} />
    </>
  );
};

export default ECCGamePage;
