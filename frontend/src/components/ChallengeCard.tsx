import React from 'react';
import { Challenge } from '../types/api';
import './ChallengeCard.css';

interface ChallengeCardProps {
  challenge: Challenge;
}

const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="challenge-card">
      <div className="challenge-header">
        <h2>Daily Challenge</h2>
        {challenge.active_date && (
          <span className="challenge-date">
            {formatDate(challenge.active_date)}
          </span>
        )}
      </div>

      <div className="challenge-content">
        <div className="address-section">
          <label>Bitcoin Address (P2PKH):</label>
          <div className="address-value">
            <code>{challenge.p2pkh_address}</code>
            <a
              href={challenge.explorer_link}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Explorer
            </a>
          </div>
        </div>

        {challenge.metadata && challenge.metadata.length > 0 && (
          <div className="metadata-section">
            <label>Tags:</label>
            <div className="metadata-tags">
              {challenge.metadata.map((meta) => (
                <span key={meta.id} className="tag">
                  {meta.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeCard;
