import React, { useEffect, useState } from 'react';
import { challengeApi } from '../services/api';

const LoadingState: React.FC = () => {
  const [rateLimitStatus, setRateLimitStatus] = useState(challengeApi.getRateLimitStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimitStatus(challengeApi.getRateLimitStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>
        {rateLimitStatus.isRateLimited
          ? 'Rate limited - waiting before retry...'
          : "Loading today's challenge..."}
      </p>
      {rateLimitStatus.isRateLimited && (
        <small style={{ opacity: 0.7, marginTop: '8px', display: 'block' }}>
          API requests: {rateLimitStatus.requestsInWindow}/{rateLimitStatus.maxRequests} per minute
        </small>
      )}
    </div>
  );
};

export default LoadingState;
