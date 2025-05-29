import React, { useState, useRef, useCallback, useEffect } from 'react';
import './CombinationWheel.css';

interface CombinationWheelProps {
  onKeyGenerated: (privateKey: string) => void;
  disabled?: boolean;
}

const CombinationWheel: React.FC<CombinationWheelProps> = ({
  onKeyGenerated,
  disabled = false,
}) => {
  const [bits, setBits] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(0);

  const wheelRef = useRef<HTMLDivElement>(null);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameRef = useRef<number>();

  // Convert rotation to ticks (each tick = ~1.41 degrees for 256 total)
  const DEGREES_PER_TICK = 360 / 256;
  const MIN_ROTATION_FOR_TICK = DEGREES_PER_TICK * 0.6; // 60% threshold

  // Get current tick position from rotation
  const getCurrentTick = useCallback(
    (currentRotation: number) => {
      return Math.floor((Math.abs(currentRotation) % 360) / DEGREES_PER_TICK);
    },
    [DEGREES_PER_TICK]
  );

  // Add a bit based on rotation direction
  const addBit = useCallback(
    (clockwise: boolean) => {
      const newBit = clockwise ? 1 : 0;
      setBits(prev => {
        const updated = [...prev, newBit];

        // Keep only last 256 bits
        if (updated.length > 256) {
          return updated.slice(-256);
        }

        // Generate private key when we have 256 bits
        if (updated.length === 256) {
          const binaryString = updated.join('');
          // Convert binary to hex using BigInt to handle 256-bit numbers
          const bigIntValue = BigInt('0b' + binaryString);
          const hexKey = bigIntValue.toString(16).padStart(64, '0');
          onKeyGenerated(hexKey);
        }

        return updated;
      });
    },
    [onKeyGenerated]
  );

  // Calculate angle from center of wheel to mouse/touch position
  const getAngleFromEvent = useCallback((event: MouseEvent | Touch, rect: DOMRect) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = event.clientX - centerX;
    const y = event.clientY - centerY;
    return Math.atan2(y, x) * (180 / Math.PI);
  }, []);

  // Handle rotation updates
  const updateRotation = useCallback(
    (deltaAngle: number, deltaTime: number) => {
      if (Math.abs(deltaAngle) < MIN_ROTATION_FOR_TICK) return;

      const currentTick = getCurrentTick(rotation);
      const newRotation = rotation + deltaAngle;
      const newTick = getCurrentTick(newRotation);

      // Check if we've moved to a new tick
      if (newTick !== currentTick || Math.abs(deltaAngle) > DEGREES_PER_TICK) {
        const clockwise = deltaAngle > 0;
        addBit(clockwise);
      }

      setRotation(newRotation);

      // Calculate rotation speed for visual feedback
      const speed = deltaTime > 0 ? Math.abs(deltaAngle) / deltaTime : 0;
      setRotationSpeed(speed);
    },
    [rotation, getCurrentTick, addBit, MIN_ROTATION_FOR_TICK, DEGREES_PER_TICK]
  );

  // Mouse/Touch event handlers
  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      const wheel = wheelRef.current;
      if (!wheel) return;

      const rect = wheel.getBoundingClientRect();
      const angle = getAngleFromEvent({ clientX, clientY } as MouseEvent, rect);

      lastAngleRef.current = angle;
      lastTimeRef.current = Date.now();
      setIsInteracting(true);
    },
    [disabled, getAngleFromEvent]
  );

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isInteracting || disabled) return;

      const wheel = wheelRef.current;
      if (!wheel) return;

      const rect = wheel.getBoundingClientRect();
      const angle = getAngleFromEvent({ clientX, clientY } as MouseEvent, rect);
      const currentTime = Date.now();

      let deltaAngle = angle - lastAngleRef.current;
      const deltaTime = currentTime - lastTimeRef.current;

      // Handle angle wraparound
      if (deltaAngle > 180) {
        deltaAngle -= 360;
      } else if (deltaAngle < -180) {
        deltaAngle += 360;
      }

      updateRotation(deltaAngle, deltaTime);

      lastAngleRef.current = angle;
      lastTimeRef.current = currentTime;
    },
    [isInteracting, disabled, getAngleFromEvent, updateRotation]
  );

  const handleEnd = useCallback(() => {
    setIsInteracting(false);
    setRotationSpeed(0);
  }, []);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleStart(e.clientX, e.clientY);
    },
    [handleStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    },
    [handleStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientX, touch.clientY);
      }
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    },
    [handleEnd]
  );

  // Event listeners setup
  useEffect(() => {
    if (isInteracting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isInteracting, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Speed decay animation
  useEffect(() => {
    if (!isInteracting && rotationSpeed > 0) {
      const decay = () => {
        setRotationSpeed(prev => Math.max(0, prev * 0.95));
        if (rotationSpeed > 0.1) {
          animationFrameRef.current = requestAnimationFrame(decay);
        }
      };
      animationFrameRef.current = requestAnimationFrame(decay);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isInteracting, rotationSpeed]);

  // Clear bits function
  const clearBits = useCallback(() => {
    setBits([]);
    setRotation(0);
  }, []);

  const progress = (bits.length / 256) * 100;
  const isComplete = bits.length === 256;

  return (
    <div className="combination-wheel">
      <div className="wheel-header">
        <h4>Combination Lock</h4>
        <p>Rotate the wheel to generate bits: clockwise = 1, counter-clockwise = 0</p>
      </div>

      <div className="wheel-container">
        <div
          ref={wheelRef}
          className={`wheel ${isInteracting ? 'interacting' : ''} ${disabled ? 'disabled' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            filter: `brightness(${1 + rotationSpeed * 0.1})`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Wheel markings */}
          {Array.from({ length: 64 }, (_, i) => (
            <div
              key={i}
              className="wheel-mark"
              style={{
                transform: `rotate(${i * (360 / 64)}deg) translateY(-90px)`,
              }}
            />
          ))}

          {/* Center dot */}
          <div className="wheel-center" />

          {/* Direction indicators */}
          <div className="direction-indicator clockwise">1</div>
          <div className="direction-indicator counter-clockwise">0</div>
        </div>

        {/* Rotation indicator */}
        <div className="rotation-indicator">
          <div className="indicator-arrow" />
        </div>
      </div>

      <div className="wheel-controls">
        <div className="progress-section">
          <div className="progress-header">
            <span>Progress: {bits.length}/256 bits</span>
            <button
              type="button"
              onClick={clearBits}
              className="clear-button"
              disabled={disabled || bits.length === 0}
            >
              Clear
            </button>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {isComplete && (
          <div className="completion-message">
            <span className="success-icon">✅</span>
            <strong>256 bits complete! Private key generated.</strong>
          </div>
        )}
      </div>

      <div className="wheel-info">
        <small className="help-text">
          <strong>Tip:</strong> Quick wiggles create random 0s and 1s. Large spins fill with mostly
          0s or 1s.
        </small>
      </div>
    </div>
  );
};

export default CombinationWheel;
