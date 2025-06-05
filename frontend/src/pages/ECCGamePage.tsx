import React, { useEffect, useState } from 'react';
import DailyView from '../components/DailyView';
import PracticeModeView from '../components/PracticeModeView';
import HowToPlayModal from '../components/HowToPlayModal';
import { useAppSelector } from '../store/hooks';
import { storageUtils } from '../utils/storage';
import './ECCGamePage.css';

const ECCGamePage: React.FC = () => {
  const gameMode = useAppSelector(state => state.game.gameMode);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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
