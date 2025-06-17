import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePracticeModeRedux } from '../hooks/usePracticeModeRedux';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setShowVictoryModal } from '../store/slices/eccCalculatorSlice';
import { setGaveUp, setHasWon } from '../store/slices/gameSlice';
import { mapToScreenCoordinate, getDisplayRange, isPointVisible } from '../utils/coordinateMapping';
import { getGeneratorPoint, publicKeyToPoint } from '../utils/ecc';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const graphRef = useRef<HTMLDivElement>(null);
  const fullscreenGraphRef = useRef<HTMLDivElement>(null);
  const isGesturingRef = useRef(false);
  const previousDistanceRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);

  // Reset pan when zoom level is 1 or below
  useEffect(() => {
    if (zoomLevel <= 1) {
      setPanX(0);
      setPanY(0);
    }
  }, [zoomLevel]);

  // Always show give up button in daily mode, but enable only after 3 operations and when not won/given up
  const showGiveUpButton = !isPracticeMode;
  const enableGiveUpButton = !isPracticeMode && operationCount >= 3 && !hasWon && !gaveUp;

  // Helper function to apply pan limits based on zoom level
  const limitPan = useCallback((panValue: number, currentZoom: number) => {
    if (currentZoom <= 1) return 0; // No panning at zoom level 1 or below
    const maxPan = (currentZoom - 1) * 50; // 50% per zoom level above 1
    return Math.max(-maxPan, Math.min(maxPan, panValue));
  }, []);

  const handleGiveUp = () => {
    // Update game state
    dispatch(setGaveUp(true));
    dispatch(setHasWon(true)); // Show victory modal
    dispatch(setShowVictoryModal(true));
  };

  // Zoom and gesture handlers
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const targetElement = e.currentTarget as HTMLDivElement;
      if (!targetElement) return;

      e.preventDefault();
      const rect = targetElement.getBoundingClientRect();
      const centerX = (e.clientX - rect.left) / rect.width;
      const centerY = (e.clientY - rect.top) / rect.height;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(1, Math.min(10, prev * zoomFactor)));

      // Adjust pan to zoom towards mouse position
      const panAdjustmentX = (centerX - 0.5) * (zoomFactor - 1) * 10;
      const panAdjustmentY = (centerY - 0.5) * (zoomFactor - 1) * 10;
      const newZoomLevel = Math.max(1, Math.min(10, zoomLevel * zoomFactor));
      setPanX(prev => limitPan(prev + panAdjustmentX, newZoomLevel));
      setPanY(prev => limitPan(prev + panAdjustmentY, newZoomLevel));
    },
    [limitPan, zoomLevel]
  );

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      isGesturingRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isGesturingRef.current || e.touches.length !== 2) return;

      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      // Calculate distance between touches
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      // Store previous distance for comparison
      if (previousDistanceRef.current === null) {
        previousDistanceRef.current = distance;
        return;
      }

      const zoomFactor = distance / previousDistanceRef.current;
      setZoomLevel(prev => Math.max(1, Math.min(10, prev * zoomFactor)));

      // Calculate center point between touches for pan
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      const targetElement = e.currentTarget as HTMLDivElement;
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const relativeX = (centerX - rect.left) / rect.width;
        const relativeY = (centerY - rect.top) / rect.height;

        const panAdjustmentX = (relativeX - 0.5) * (zoomFactor - 1) * 10;
        const panAdjustmentY = (relativeY - 0.5) * (zoomFactor - 1) * 10;
        const newZoomLevel = Math.max(1, Math.min(10, zoomLevel * zoomFactor));
        setPanX(prev => limitPan(prev + panAdjustmentX, newZoomLevel));
        setPanY(prev => limitPan(prev + panAdjustmentY, newZoomLevel));
      }

      previousDistanceRef.current = distance;
    },
    [limitPan, zoomLevel]
  );

  const handleTouchEnd = useCallback(() => {
    isGesturingRef.current = false;
    previousDistanceRef.current = null;
  }, []);

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only handle left mouse button and ignore if touch is active
    if (e.button !== 0 || isGesturingRef.current) return;

    isDraggingRef.current = true;
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !lastMousePositionRef.current) return;

      e.preventDefault();
      const currentPos = { x: e.clientX, y: e.clientY };
      const deltaX = currentPos.x - lastMousePositionRef.current.x;
      const deltaY = currentPos.y - lastMousePositionRef.current.y;

      // Convert pixel movement to percentage of graph size
      const targetElement = e.currentTarget as HTMLDivElement;
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const panDeltaX = (deltaX / rect.width) * 100;
        const panDeltaY = (deltaY / rect.height) * 100;

        // Apply pan limits based on zoom level
        setPanX(prev => limitPan(prev + panDeltaX, zoomLevel));
        setPanY(prev => limitPan(prev + panDeltaY, zoomLevel));
      }

      lastMousePositionRef.current = currentPos;
    },
    [limitPan, zoomLevel]
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    lastMousePositionRef.current = null;
  }, []);

  // Attach event listeners to both graphs
  useEffect(() => {
    const graphElement = graphRef.current;
    const fullscreenGraphElement = fullscreenGraphRef.current;

    const attachListeners = (element: HTMLDivElement) => {
      element.addEventListener('wheel', handleWheel, { passive: false });
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
      element.addEventListener('mousedown', handleMouseDown, { passive: false });
      element.addEventListener('mousemove', handleMouseMove, { passive: false });
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseUp); // End drag when mouse leaves
    };

    const removeListeners = (element: HTMLDivElement) => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };

    if (graphElement) {
      attachListeners(graphElement);
    }

    if (fullscreenGraphElement) {
      attachListeners(fullscreenGraphElement);
    }

    return () => {
      if (graphElement) {
        removeListeners(graphElement);
      }
      if (fullscreenGraphElement) {
        removeListeners(fullscreenGraphElement);
      }
    };
  }, [
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    isFullscreen,
  ]);

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

  // Create a memoized version of mapToScreenCoordinate with current zoom/pan state
  const mapCoordinate = useCallback(
    (coord: bigint, isY = false) => {
      return mapToScreenCoordinate(coord, isY, zoomLevel, panX, panY);
    },
    [zoomLevel, panX, panY]
  );

  // Calculate generator point screen coordinates
  const generatorX = generatorPoint.isInfinity ? 50 : mapCoordinate(generatorPoint.x, false);
  const generatorY = generatorPoint.isInfinity ? 50 : mapCoordinate(generatorPoint.y, true);

  const getVisiblePoints = useCallback((): GraphPoint[] => {
    const allPoints: GraphPoint[] = [];

    // Always add generator point G
    const generatorEntry: GraphPoint = {
      id: 'generator',
      x: generatorX,
      y: generatorY,
      label: 'Start (G)',
      color: '#3b82f6', // blue
      description: 'Generator point',
      point: generatorPoint,
      type: 'generator',
    };
    allPoints.push(generatorEntry);

    // Add original challenge point if available
    if (challengePublicKey) {
      const originalPoint = publicKeyToPoint(challengePublicKey);
      const originalX = originalPoint.isInfinity ? 50 : mapCoordinate(originalPoint.x, false);
      const originalY = originalPoint.isInfinity ? 50 : mapCoordinate(originalPoint.y, true);

      const originalEntry: GraphPoint = {
        id: 'original',
        x: originalX,
        y: originalY,
        label: 'Goal',
        color: '#f59e0b', // amber
        description: 'Goal point',
        point: originalPoint,
        type: 'challenge',
      };
      allPoints.push(originalEntry);
    }

    // Add saved points
    savedPoints.forEach(savedPoint => {
      if (!savedPoint.point.isInfinity) {
        const savedX = mapCoordinate(savedPoint.point.x, false);
        const savedY = mapCoordinate(savedPoint.point.y, true);

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
      const currentX = mapCoordinate(selectedPoint.x, false);
      const currentY = mapCoordinate(selectedPoint.y, true);

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
    mapCoordinate,
  ]);

  const graphPoints = getVisiblePoints();
  const displayRange = getDisplayRange(zoomLevel);

  // Render the graph content that will be used in both normal and fullscreen modes
  const renderGraphContent = (className = 'ecc-graph') => (
    <div className={className} ref={className === 'ecc-graph' ? graphRef : fullscreenGraphRef}>
      {/* Graph border */}
      <div className="graph-border"></div>

      {/* Coordinate system */}
      <div className="graph-axes">
        <div className="axis-label x-label">x</div>
        <div className="axis-label y-label">y</div>
      </div>

      {/* Vertical dashed line at G - only show if generator is within visible area */}
      {generatorX >= 0 && generatorX <= 100 && (
        <div className="generator-line" style={{ left: `${generatorX}%` }}></div>
      )}

      {/* Curve visualization */}
      <div className="curve-line"></div>

      {/* Plot points with visibility culling */}
      {graphPoints
        .filter(point => isPointVisible(point.x, point.y, 0))
        .map(point => {
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
              <div className="point-label">{point.label}</div>
            </div>
          );
        })}

      {/* Graph range indicators with zoom-adjusted values */}
      <div className="range-indicator bottom-left">0</div>
      <div className="range-indicator bottom-right">
        {zoomLevel === 1 ? 'p' : `${displayRange.max.toString(16).slice(0, 8)}...`}
      </div>
      <div className="range-indicator top-left">
        {zoomLevel === 1 ? 'p' : `${displayRange.max.toString(16).slice(0, 8)}...`}
      </div>

      {/* Fullscreen button - only show in normal mode */}
      {className === 'ecc-graph' && (
        <button
          className="fullscreen-button"
          onClick={() => setIsFullscreen(true)}
          title="View in fullscreen"
        >
          ⛶
        </button>
      )}
    </div>
  );

  return (
    <>
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
                    {isGenerating ? 'Generating...' : 'New Goal ▼'}
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

        {renderGraphContent()}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen &&
        createPortal(
          <div className="modal-overlay" onClick={() => setIsFullscreen(false)}>
            <div className="fullscreen-graph-modal" onClick={e => e.stopPropagation()}>
              <div className="fullscreen-header">
                <div className="formula">y² = x³ + 7 (mod p)</div>
                <button
                  className="modal-close"
                  onClick={() => setIsFullscreen(false)}
                  title="Exit fullscreen"
                >
                  ×
                </button>
              </div>
              {renderGraphContent('ecc-graph-fullscreen')}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ECCGraph;
