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

  // Create histogram data (group operations into bins)
  const createHistogram = () => {
    if (stats.operationHistory.length === 0) return [];

    const min = Math.min(...stats.operationHistory);
    const max = Math.max(...stats.operationHistory);
    const binCount = Math.min(10, stats.operationHistory.length);
    const binSize = Math.max(1, Math.ceil((max - min) / binCount));

    const bins: { range: string; count: number; height: number }[] = [];

    for (let i = 0; i < binCount; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize - 1;
      const count = stats.operationHistory.filter(
        operations => operations >= binStart && operations <= binEnd
      ).length;

      bins.push({
        range: binSize === 1 ? binStart.toString() : `${binStart}-${binEnd}`,
        count,
        height:
          count > 0
            ? Math.max(20, (count / Math.max(...stats.operationHistory.map(() => 1))) * 60)
            : 0,
      });
    }

    return bins;
  };

  const histogramData = createHistogram();

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
              <div className="stat-number">{stats.currentStreak}</div>
              <div className="stat-label">Current Streak</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.maxStreak}</div>
              <div className="stat-label">Max Streak</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">
                {stats.averageOperations > 0 ? Math.round(stats.averageOperations) : 0}
              </div>
              <div className="stat-label">Avg Operations</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.bestOperations || '—'}</div>
              <div className="stat-label">Best Operations</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.practiceGamesPlayed}</div>
              <div className="stat-label">Practice Games</div>
            </div>
          </div>

          {histogramData.length > 0 && (
            <div className="histogram-section">
              <h3>Operations Distribution</h3>
              <div className="histogram">
                {histogramData.map((bin, index) => (
                  <div key={index} className="histogram-bar">
                    <div
                      className="bar-fill"
                      style={{ height: `${bin.height}px` }}
                      title={`${bin.range} operations: ${bin.count} games`}
                    />
                    <div className="bar-label">{bin.range}</div>
                  </div>
                ))}
              </div>
              <div className="histogram-axis-label">Operations per Game</div>
            </div>
          )}

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
