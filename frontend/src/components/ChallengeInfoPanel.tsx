import React, { useState } from 'react';
import type { Challenge } from '../types/api';
import './ChallengeInfoPanel.css';

interface ChallengeInfoPanelProps {
  challenge: Challenge;
  guessCount: number;
}

interface InfoStage {
  id: string;
  title: string;
  icon: string;
  unlockAt: number;
  description: string;
}

const INFO_STAGES: InfoStage[] = [
  {
    id: 'address',
    title: 'Address',
    icon: '📍',
    unlockAt: 0,
    description: 'Bitcoin P2PKH address',
  },
  {
    id: 'pubkey',
    title: 'Public Key',
    icon: '🔑',
    unlockAt: 1,
    description: 'ECDSA public key (compressed)',
  },
  {
    id: 'graph',
    title: 'Curve Graph',
    icon: '📊',
    unlockAt: 2,
    description: 'Visual representation on secp256k1 curve',
  },
  {
    id: 'half',
    title: 'Half Point',
    icon: '➗',
    unlockAt: 3,
    description: 'Public key divided by 2',
  },
  {
    id: 'double',
    title: 'Double Point',
    icon: '✖️',
    unlockAt: 4,
    description: 'Public key multiplied by 2',
  },
  {
    id: 'playpen',
    title: 'Playpen',
    icon: '🛠️',
    unlockAt: 5,
    description: 'Interactive manipulation tools',
  },
];

const ChallengeInfoPanel: React.FC<ChallengeInfoPanelProps> = ({ challenge, guessCount }) => {
  const [activeStage, setActiveStage] = useState('address');

  const isStageUnlocked = (stage: InfoStage) => {
    return guessCount >= stage.unlockAt;
  };

  const getUnlockedStages = () => {
    return INFO_STAGES.filter(stage => isStageUnlocked(stage));
  };

  const renderAddressStage = () => (
    <div className="info-stage address-stage">
      <div className="stage-header">
        <h3>Bitcoin Address</h3>
        <p>This is the P2PKH address you need to find the private key for</p>
      </div>
      <div className="address-display">
        <div className="address-card">
          <label>P2PKH Address:</label>
          <div className="address-value">
            <code>{challenge.p2pkh_address}</code>
            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(challenge.p2pkh_address)}
            >
              📋
            </button>
          </div>
        </div>
        <div className="explorer-link">
          <a href={challenge.explorer_link} target="_blank" rel="noopener noreferrer">
            View on Block Explorer →
          </a>
        </div>
      </div>
    </div>
  );

  const renderPubkeyStage = () => (
    <div className="info-stage pubkey-stage">
      <div className="stage-header">
        <h3>Public Key</h3>
        <p>The ECDSA public key that corresponds to this address</p>
      </div>
      <div className="pubkey-display">
        <div className="pubkey-card">
          <label>Compressed Public Key:</label>
          <div className="pubkey-value">
            <code>{challenge.public_key}</code>
            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(challenge.public_key)}
            >
              📋
            </button>
          </div>
        </div>
        <div className="pubkey-info">
          <div className="info-item">
            <span className="info-label">Format:</span>
            <span>Compressed (33 bytes)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Curve:</span>
            <span>secp256k1</span>
          </div>
          <div className="info-item">
            <span className="info-label">Prefix:</span>
            <span>{challenge.public_key.startsWith('02') ? '02 (even y)' : '03 (odd y)'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGraphStage = () => (
    <div className="info-stage graph-stage">
      <div className="stage-header">
        <h3>Elliptic Curve Visualization</h3>
        <p>Points on the secp256k1 curve: your public key, generator point G, and -G</p>
      </div>
      <div className="graph-container">
        <div className="graph-placeholder">
          <div className="graph-axes">
            <div className="x-axis"></div>
            <div className="y-axis"></div>
          </div>
          <div className="curve-line"></div>
          <div className="point generator-point" style={{ left: '30%', top: '40%' }}>
            <span className="point-dot"></span>
            <span className="point-label">G</span>
          </div>
          <div className="point negative-generator-point" style={{ left: '30%', top: '60%' }}>
            <span className="point-dot"></span>
            <span className="point-label">-G</span>
          </div>
          <div className="point pubkey-point" style={{ left: '70%', top: '35%' }}>
            <span className="point-dot pubkey-dot"></span>
            <span className="point-label">PubKey</span>
          </div>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span className="legend-dot generator"></span>
            <span>Generator Point (G)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot negative"></span>
            <span>Negative Generator (-G)</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot challenge"></span>
            <span>Challenge Public Key</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHalfStage = () => (
    <div className="info-stage half-stage">
      <div className="stage-header">
        <h3>Half Point Analysis</h3>
        <p>Public key divided by 2 - another point on the curve</p>
      </div>
      <div className="graph-container">
        <div className="graph-placeholder">
          <div className="graph-axes">
            <div className="x-axis"></div>
            <div className="y-axis"></div>
          </div>
          <div className="curve-line"></div>
          <div className="point generator-point" style={{ left: '30%', top: '40%' }}>
            <span className="point-dot"></span>
            <span className="point-label">G</span>
          </div>
          <div className="point negative-generator-point" style={{ left: '30%', top: '60%' }}>
            <span className="point-dot"></span>
            <span className="point-label">-G</span>
          </div>
          <div className="point pubkey-point" style={{ left: '70%', top: '35%' }}>
            <span className="point-dot pubkey-dot"></span>
            <span className="point-label">PubKey</span>
          </div>
          <div className="point half-point" style={{ left: '50%', top: '45%' }}>
            <span className="point-dot half-dot"></span>
            <span className="point-label">PubKey/2</span>
          </div>
        </div>
        <div className="half-info">
          <div className="calculation-display">
            <code>PubKey ÷ 2 = [Coming Soon]</code>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDoubleStage = () => (
    <div className="info-stage double-stage">
      <div className="stage-header">
        <h3>Double Point Analysis</h3>
        <p>Public key multiplied by 2 - point doubling on the curve</p>
      </div>
      <div className="graph-container">
        <div className="graph-placeholder">
          <div className="graph-axes">
            <div className="x-axis"></div>
            <div className="y-axis"></div>
          </div>
          <div className="curve-line"></div>
          <div className="point generator-point" style={{ left: '30%', top: '40%' }}>
            <span className="point-dot"></span>
            <span className="point-label">G</span>
          </div>
          <div className="point negative-generator-point" style={{ left: '30%', top: '60%' }}>
            <span className="point-dot"></span>
            <span className="point-label">-G</span>
          </div>
          <div className="point pubkey-point" style={{ left: '70%', top: '35%' }}>
            <span className="point-dot pubkey-dot"></span>
            <span className="point-label">PubKey</span>
          </div>
          <div className="point half-point" style={{ left: '50%', top: '45%' }}>
            <span className="point-dot half-dot"></span>
            <span className="point-label">PubKey/2</span>
          </div>
          <div className="point double-point" style={{ left: '85%', top: '25%' }}>
            <span className="point-dot double-dot"></span>
            <span className="point-label">PubKey×2</span>
          </div>
        </div>
        <div className="double-info">
          <div className="calculation-display">
            <code>PubKey × 2 = [Coming Soon]</code>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlaypenStage = () => (
    <div className="info-stage playpen-stage">
      <div className="stage-header">
        <h3>Interactive Playpen</h3>
        <p>Manipulate and explore elliptic curve operations in real-time</p>
      </div>
      <div className="playpen-container">
        <div className="playpen-placeholder">
          <div className="playpen-header">
            <h4>🛠️ Elliptic Curve Playground</h4>
            <p>Coming Soon: Interactive curve manipulation</p>
          </div>
          <div className="playpen-content">
            <div className="tool-section">
              <h5>Point Operations</h5>
              <div className="tool-grid">
                <div className="tool-item">Point Addition</div>
                <div className="tool-item">Point Doubling</div>
                <div className="tool-item">Scalar Multiplication</div>
                <div className="tool-item">Point Negation</div>
              </div>
            </div>
            <div className="tool-section">
              <h5>Key Analysis</h5>
              <div className="tool-grid">
                <div className="tool-item">Private Key Range</div>
                <div className="tool-item">Key Distance</div>
                <div className="tool-item">Pattern Detection</div>
                <div className="tool-item">Bit Analysis</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStageContent = () => {
    switch (activeStage) {
      case 'address':
        return renderAddressStage();
      case 'pubkey':
        return renderPubkeyStage();
      case 'graph':
        return renderGraphStage();
      case 'half':
        return renderHalfStage();
      case 'double':
        return renderDoubleStage();
      case 'playpen':
        return renderPlaypenStage();
      default:
        return renderAddressStage();
    }
  };

  const unlockedStages = getUnlockedStages();

  return (
    <div className="challenge-info-panel">
      <div className="panel-header">
        <h2>Challenge Information</h2>
        <div className="unlock-progress">
          {INFO_STAGES.map((stage, _) => (
            <div
              key={stage.id}
              className={`progress-dot ${isStageUnlocked(stage) ? 'unlocked' : 'locked'}`}
              title={`${stage.title} - ${isStageUnlocked(stage) ? 'Unlocked' : `Unlocks after ${stage.unlockAt} guesses`}`}
            >
              {isStageUnlocked(stage) ? '●' : '○'}
            </div>
          ))}
        </div>
      </div>

      <div className="panel-navigation">
        {unlockedStages.map(stage => (
          <button
            key={stage.id}
            className={`nav-tab ${activeStage === stage.id ? 'active' : ''}`}
            onClick={() => setActiveStage(stage.id)}
          >
            <span className="tab-icon">{stage.icon}</span>
            <span className="tab-title">{stage.title}</span>
          </button>
        ))}
        {INFO_STAGES.filter(stage => !isStageUnlocked(stage)).map(stage => (
          <button
            key={stage.id}
            className="nav-tab locked"
            disabled
            title={`Unlocks after ${stage.unlockAt} guesses`}
          >
            <span className="tab-icon">🔒</span>
            <span className="tab-title">{stage.title}</span>
          </button>
        ))}
      </div>

      <div className="panel-content">{renderStageContent()}</div>
    </div>
  );
};

export default ChallengeInfoPanel;
