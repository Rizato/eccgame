import Decimal from 'decimal.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setShowVictoryModal } from '../store/slices/eccCalculatorSlice';
import { setGaveUp, setHasWon } from '../store/slices/gameSlice';
import { CURVE_P, getGeneratorPoint, publicKeyToPoint } from '../utils/ecc';
import type { ECPoint } from '../types/ecc';
import './ECCGraph.css';

interface ECCGraphProps {
  challengePublicKey: string;
  onPointClick: (point: ECPoint) => void;
  operationCount?: number;
}

interface GraphPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  description: string;
  point: ECPoint;
  type: 'generator' | 'challenge' | 'saved' | 'current';
  isOverlapping?: boolean;
  overlappingPoints?: GraphPoint[];
}

const ECCGraph: React.FC<ECCGraphProps> = ({
  challengePublicKey,
  onPointClick,
  operationCount = 0,
}) => {
  const dispatch = useAppDispatch();
  const gameMode = useAppSelector(state => state.game.gameMode);
  const hasWon = useAppSelector(state => state.game.hasWon);
  const gaveUp = useAppSelector(state => state.game.gaveUp);
  const { selectedPoint, savedPoints } = useAppSelector(state =>
    gameMode === 'practice' ? state.practiceCalculator : state.dailyCalculator
  );

  const { setDifficulty, generatePracticeChallenge, isGenerating } = usePracticeModeRedux();

  const isPracticeMode = gameMode === 'practice';
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Always show give up button in daily mode, but enable only after 3 operations and when not won/given up
  const showGiveUpButton = !isPracticeMode;
  const enableGiveUpButton = !isPracticeMode && operationCount >= 3 && !hasWon && !gaveUp;

  const handleGiveUp = () => {
    // Update game state
    dispatch(setGaveUp(true));
    dispatch(setHasWon(true)); // Show victory modal
    dispatch(setShowVictoryModal(true));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDifficultyDropdown(false);
      }
    };

    if (showDifficultyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDifficultyDropdown]);

  const generatorPoint = getGeneratorPoint();

  // Map large coordinate values to screen percentage (0-100)
  const mapToScreenCoordinate = useCallback((coord: bigint) => {
    // Use Decimal.js for precise arithmetic to avoid precision loss
    const coordDecimal = new Decimal(coord.toString());
    const curvePDecimal = new Decimal(CURVE_P.toString());

    // Calculate percentage with high precision
    const percent = coordDecimal.dividedBy(curvePDecimal);

    // Convert to screen coordinate (5-95% to avoid edges)
    const screenCoord = percent.times(90).plus(5);

    return screenCoord.toNumber();
  }, []);

  // Calculate generator point screen coordinates
  const generatorX = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.x);
  const generatorY = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.y);

  const getVisiblePoints = useCallback((): GraphPoint[] => {
    const allPoints: GraphPoint[] = [];

    // Always add generator point G
    const generatorEntry: GraphPoint = {
      id: 'generator',
      x: generatorX,
      y: generatorY,
      label: 'G',
      color: '#3b82f6', // blue
      description: 'Generator point',
      point: generatorPoint,
      type: 'generator',
    };
    allPoints.push(generatorEntry);

    // Add original challenge point if available
    if (challengePublicKey) {
      const originalPoint = publicKeyToPoint(challengePublicKey);
      const originalX = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.x);
      const originalY = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.y);

      const originalEntry: GraphPoint = {
        id: 'original',
        x: originalX,
        y: originalY,
        label: 'Wallet',
        color: '#f59e0b', // amber
        description: 'Wallet point',
        point: originalPoint,
        type: 'challenge',
      };
      allPoints.push(originalEntry);
    }

    // Add saved points
    savedPoints.forEach(savedPoint => {
      if (!savedPoint.point.isInfinity) {
        const savedX = mapToScreenCoordinate(savedPoint.point.x);
        const savedY = mapToScreenCoordinate(savedPoint.point.y);

        allPoints.push({
          id: savedPoint.id,
          x: savedX,
          y: savedY,
          label: savedPoint.label,
          color: '#8b5cf6', // purple for saved points
          description: `Saved point: ${savedPoint.label}`,
          point: savedPoint.point,
          type: 'saved',
        });
      }
    });

    // Add selected point if it's unique
    if (!selectedPoint.isInfinity) {
      const currentX = mapToScreenCoordinate(selectedPoint.x);
      const currentY = mapToScreenCoordinate(selectedPoint.y);

      allPoints.push({
        id: 'current',
        x: currentX,
        y: currentY,
        label: 'Current',
        color: '#ef4444', // red
        description: 'Current point',
        point: selectedPoint,
        type: 'current',
      });
    }

    // Group points by their coordinates to detect overlaps
    const groupedPoints = new Map<string, GraphPoint[]>();

    allPoints.forEach(point => {
      const key = `${point.point.x}_${point.point.y}_${point.point.isInfinity}`;
      if (!groupedPoints.has(key)) {
        groupedPoints.set(key, []);
      }
      groupedPoints.get(key)!.push(point);
    });

    // Convert groups back to visible points, combining overlapping ones
    const visiblePoints: GraphPoint[] = [];

    for (const [, group] of groupedPoints) {
      if (group.length === 1) {
        // Single point - show as normal
        visiblePoints.push(group[0]);
      } else {
        // Multiple overlapping points - combine them
        const combinedLabels = group.map(p => p.label).join('/');
        const combinedDescriptions = group.map(p => p.description).join(' + ');

        // Create gradient color for overlapping points
        const colors = group.map(p => p.color);
        const gradientColor = `linear-gradient(45deg, ${colors.join(', ')})`;

        // Use the first point's position
        const basePoint = group[0];

        visiblePoints.push({
          ...basePoint,
          label: combinedLabels,
          color: gradientColor,
          description: combinedDescriptions,
          isOverlapping: true,
          overlappingPoints: group,
        });
      }
    }

    return visiblePoints;
  }, [
    generatorX,
    generatorY,
    generatorPoint,
    challengePublicKey,
    savedPoints,
    selectedPoint,
    mapToScreenCoordinate,
  ]);

  const graphPoints = getVisiblePoints();

  return (
    <div className="graph-section graph-display">
      <div className="graph-content">
        <div className="graph-header">
          <div className="formula">y² = x³ + 7 (mod p)</div>
          <div className="graph-actions">
            {isPracticeMode && (
              <div className="combined-control" ref={dropdownRef}>
                <button
                  onClick={() =>
                    !isGenerating && setShowDifficultyDropdown(!showDifficultyDropdown)
                  }
                  className={`graph-action-button practice-button ${isGenerating ? 'disabled' : ''}`}
                  disabled={isGenerating}
                  title={isGenerating ? 'Generating new wallet...' : 'Create new wallet'}
                >
                  {isGenerating ? 'Generating...' : 'New Wallet ▼'}
                </button>
                {showDifficultyDropdown && !isGenerating && (
                  <div className="difficulty-dropdown">
                    <button
                      onClick={() => {
                        setDifficulty('easy');
                        generatePracticeChallenge();
                        setShowDifficultyDropdown(false);
                      }}
                      className="difficulty-option"
                    >
                      Easy
                    </button>
                    <button
                      onClick={() => {
                        setDifficulty('medium');
                        generatePracticeChallenge();
                        setShowDifficultyDropdown(false);
                      }}
                      className="difficulty-option"
                    >
                      Medium
                    </button>
                    <button
                      onClick={() => {
                        setDifficulty('hard');
                        generatePracticeChallenge();
                        setShowDifficultyDropdown(false);
                      }}
                      className="difficulty-option"
                    >
                      Hard
                    </button>
                  </div>
                )}
              </div>
            )}
            {showGiveUpButton && (
              <button
                onClick={handleGiveUp}
                className={`graph-action-button give-up-button ${!enableGiveUpButton ? 'disabled' : ''}`}
                disabled={!enableGiveUpButton}
                title={
                  !enableGiveUpButton
                    ? 'Available after 3 operations'
                    : 'Give up and reveal solution'
                }
              >
                Give Up
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="ecc-graph">
        {/* Graph border */}
        <div className="graph-border"></div>

        {/* Coordinate system */}
        <div className="graph-axes">
          <div className="axis-label x-label">x</div>
          <div className="axis-label y-label">y</div>
        </div>

        {/* Vertical dashed line at G */}
        <div className="generator-line" style={{ left: `${generatorX}%` }}></div>

        {/* Curve visualization */}
        <div className="curve-line"></div>

        {/* Plot points */}
        {graphPoints.map((point, index) => {
          // Calculate label offset to prevent overlap
          let labelOffset = 0;
          const labelSpacing = 25; // pixels

          // Check for nearby points and adjust label position
          for (let i = 0; i < index; i++) {
            const otherPoint = graphPoints[i];
            const dx = Math.abs(point.x - otherPoint.x);
            const dy = Math.abs(point.y - otherPoint.y);

            // If points are close, offset the label
            if (dx < 8 && dy < 8) {
              labelOffset += labelSpacing;
            }
          }

          return (
            <div
              key={point.id}
              className={`ecc-point ${point.id}${point.isOverlapping ? ' overlapping' : ''}`}
              style={
                {
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  '--point-color': point.isOverlapping ? 'transparent' : point.color,
                } as React.CSSProperties
              }
              title={point.description}
              onClick={() => onPointClick(point.point)}
            >
              <div
                className="point-dot"
                style={
                  point.isOverlapping
                    ? {
                        background: point.color,
                        border: '2px solid var(--card-background)',
                      }
                    : {}
                }
              ></div>
              <div
                className="point-label"
                style={{
                  transform: labelOffset > 0 ? `translateY(${labelOffset}px)` : undefined,
                  zIndex: 1000 + index, // Ensure labels don't overlap
                }}
              >
                {point.label}
              </div>
            </div>
          );
        })}

        {/* Graph range indicators */}
        <div className="range-indicator bottom-left">0</div>
        <div className="range-indicator bottom-right">p</div>
        <div className="range-indicator top-left">p</div>
      </div>
    </div>
  );
};

export default ECCGraph;
