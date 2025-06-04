import React from 'react';
import DailyView from '../components/DailyView';
import PracticeModeView from '../components/PracticeModeView';
import { useAppSelector } from '../store/hooks';
import './ECCGamePage.css';

const ECCGamePage: React.FC = () => {
  const gameMode = useAppSelector(state => state.game.gameMode);

  if (gameMode === 'practice') {
    return <PracticeModeView />;
  }

  return <DailyView />;
};

export default ECCGamePage;
