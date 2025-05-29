import React, { useState, useCallback } from 'react';
import './ZoomSlider.css';

interface ZoomSliderProps {
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  label?: string;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

const ZoomSlider: React.FC<ZoomSliderProps> = ({
  min = 0.1,
  max = 5.0,
  step = 0.1,
  defaultValue = 1.0,
  onChange,
  label = 'Zoom',
  disabled = false,
  showValue = true,
  formatValue = value => `${value.toFixed(1)}x`,
}) => {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);
      setValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    setValue(defaultValue);
    onChange?.(defaultValue);
  }, [defaultValue, onChange]);

  const handleZoomIn = useCallback(() => {
    const newValue = Math.min(max, value + step);
    setValue(newValue);
    onChange?.(newValue);
  }, [value, max, step, onChange]);

  const handleZoomOut = useCallback(() => {
    const newValue = Math.max(min, value - step);
    setValue(newValue);
    onChange?.(newValue);
  }, [value, min, step, onChange]);

  return (
    <div className="zoom-slider">
      <div className="zoom-slider-header">
        <label htmlFor="zoom-slider-input" className="zoom-slider-label">
          {label}:
        </label>
        {showValue && <span className="zoom-slider-value">{formatValue(value)}</span>}
      </div>

      <div className="zoom-slider-controls">
        <button
          type="button"
          className="zoom-button zoom-out"
          onClick={handleZoomOut}
          disabled={disabled || value <= min}
          title="Zoom out"
        >
          −
        </button>

        <div className="zoom-slider-track">
          <input
            id="zoom-slider-input"
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            className="zoom-slider-input"
            disabled={disabled}
          />
        </div>

        <button
          type="button"
          className="zoom-button zoom-in"
          onClick={handleZoomIn}
          disabled={disabled || value >= max}
          title="Zoom in"
        >
          +
        </button>

        <button
          type="button"
          className="zoom-reset"
          onClick={handleReset}
          disabled={disabled}
          title="Reset zoom"
        >
          ⌂
        </button>
      </div>
    </div>
  );
};

export default ZoomSlider;
