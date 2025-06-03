import React from 'react';

const LoadingState: React.FC = () => {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Loading today's challenge...</p>
    </div>
  );
};

export default LoadingState;
