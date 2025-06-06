import React from 'react';
import { createPortal } from 'react-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { resetStats } from '../store/slices/statsSlice';
import './StatsModal.css';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const stats = useAppSelector(state => state.stats.stats);

  if (!isOpen) return null;

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const handleResetStats = () => {
    if (
      window.confirm('Are you sure you want to reset all statistics? This action cannot be undone.')
    ) {
      dispatch(resetStats());
    }
  };

  return createPortal(
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        <div className="stats-header">
          <button className="stats-close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
          <h2 className="stats-title">Game Statistics</h2>
        </div>

        <div className="stats-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.gamesPlayed}</div>
              <div className="stat-label">Games Played</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.gamesWon}</div>
              <div className="stat-label">Games Won</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{winRate}%</div>
              <div className="stat-label">Win Rate</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">
                {stats.averageOperations > 0 ? Math.round(stats.averageOperations) : 0}
              </div>
              <div className="stat-label">Avg Operations</div>
            </div>
          </div>

          <div className="stats-actions">
            <button onClick={handleResetStats} className="reset-stats-button">
              Reset Statistics
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StatsModal;
