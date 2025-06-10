import React, { useEffect } from 'react';
import DailyView from '../components/DailyView';
import HowToPlayModal from '../components/HowToPlayModal';
import PracticeModeView from '../components/PracticeModeView';
import GameFooter from '../components/GameFooter';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setGameMode } from '../store/slices/gameSlice';
import { selectShowHowToPlayModal, closeHowToPlayModal } from '../store/slices/uiSlice';
import './ECCGamePage.css';

interface ECCGamePageProps {
  mode?: 'daily' | 'practice';
}

const ECCGamePage: React.FC<ECCGamePageProps> = ({ mode = 'daily' }) => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const showHowToPlay = useAppSelector(selectShowHowToPlayModal);

  // Set game mode based on route
  useEffect(() => {
    dispatch(setGameMode(mode));
  }, [dispatch, mode]);

  const handleCloseHowToPlay = () => {
    dispatch(closeHowToPlayModal());
  };

  return (
    <div className="ecc-game-page-wrapper">
      {gameMode === 'practice' ? <PracticeModeView /> : <DailyView />}

      <HowToPlayModal isOpen={showHowToPlay} onClose={handleCloseHowToPlay} />
      <GameFooter />
    </div>
  );
};

export default ECCGamePage;
