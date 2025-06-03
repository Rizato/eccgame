import React, { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getGeneratorPoint, publicKeyToPoint } from '../utils/ecc';
import type { ECPoint } from '../types/ecc';
import './ECCGraph.css';

interface ECCGraphProps {
  challengePublicKey: string;
  onPointClick: (point: ECPoint) => void;
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

const ECCGraph: React.FC<ECCGraphProps> = ({ challengePublicKey, onPointClick }) => {
  const { selectedPoint, savedPoints } = useAppSelector(state => state.eccCalculator);

  const generatorPoint = getGeneratorPoint();

  // Map large coordinate values to screen percentage (0-100)
  const mapToScreenCoordinate = useCallback((coord: bigint, isY: boolean = false) => {
    // Use the last 32 bits for better distribution
    const lastBits = Number(coord & 0xffffffffn);
    const percentage = (lastBits % 80) + 10; // Keep between 10-90% to avoid edges
    return isY ? percentage : percentage;
  }, []);

  // Calculate generator point screen coordinates
  const generatorX = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.x);
  const generatorY = generatorPoint.isInfinity ? 50 : mapToScreenCoordinate(generatorPoint.y, true);

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

    // Always add original challenge point
    const originalPoint = publicKeyToPoint(challengePublicKey);
    const originalX = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.x);
    const originalY = originalPoint.isInfinity ? 50 : mapToScreenCoordinate(originalPoint.y, true);

    const originalEntry: GraphPoint = {
      id: 'original',
      x: originalX,
      y: originalY,
      label: 'Wallet',
      color: '#f59e0b', // amber
      description: 'Original challenge point',
      point: originalPoint,
      type: 'challenge',
    };
    allPoints.push(originalEntry);

    // Add saved points
    savedPoints.forEach(savedPoint => {
      if (!savedPoint.point.isInfinity) {
        const savedX = mapToScreenCoordinate(savedPoint.point.x);
        const savedY = mapToScreenCoordinate(savedPoint.point.y, true);

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
      const currentY = mapToScreenCoordinate(selectedPoint.y, true);

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

  // Check if selected point is at generator for legend coloring
  const isAtGenerator =
    selectedPoint.x === generatorPoint.x &&
    selectedPoint.y === generatorPoint.y &&
    !selectedPoint.isInfinity;

  return (
    <div className="graph-section graph-display">
      <div className="graph-content">
        <div className="formula">y² = x³ + 7 (mod p)</div>
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
        {graphPoints.map(point => (
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
            <div className="point-label">{point.label}</div>
          </div>
        ))}

        {/* Graph range indicators */}
        <div className="range-indicator bottom-left">0</div>
        <div className="range-indicator bottom-right">p</div>
        <div className="range-indicator top-left">p</div>
      </div>

      {/* Legend at bottom */}
      <div className="legend-grid">
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>G</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ backgroundColor: '#f59e0b' }}></div>
          <span>Wallet</span>
        </div>
        {savedPoints.length > 0 && (
          <div className="legend-item">
            <div className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span>Saved</span>
          </div>
        )}
        <div className="legend-item">
          <div
            className="legend-dot"
            style={{ backgroundColor: isAtGenerator ? '#22c55e' : '#ef4444' }}
          ></div>
          <span>Current</span>
        </div>
      </div>
    </div>
  );
};

export default ECCGraph;
