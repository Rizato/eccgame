import React from 'react';
import type { Challenge } from '../types/api';
import './ChallengeInfo.css';

interface ChallengeInfoProps {
  challenge: Challenge;
}

const ChallengeInfo: React.FC<ChallengeInfoProps> = ({ challenge }) => {
  return (
    <div className="challenge-info-container">
      <div className="challenge-info-content">
        <div className="info-section">
          <label>Target Address:</label>
          <div className="target-address-display">
            <code className="address-code">{challenge.p2pkh_address}</code>
          </div>
        </div>

        {challenge.explorer_link && (
          <div className="info-section">
            <label>Explorer:</label>
            <a
              href={challenge.explorer_link}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              View on Blockchain Explorer
            </a>
          </div>
        )}

        {challenge.metadata && challenge.metadata.length > 0 && (
          <div className="info-section">
            <label>Tags:</label>
            <div className="metadata-tags">
              {challenge.metadata.map(meta => (
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

export default ChallengeInfo;
