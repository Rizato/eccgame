import React, { useState } from 'react';
import ZoomSlider from './ZoomSlider';

const ZoomSliderTest: React.FC = () => {
  const [zoomValue, setZoomValue] = useState(1.0);
  const [scaleValue, setScaleValue] = useState(100);
  const [percentValue, setPercentValue] = useState(50);

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>ZoomSlider Component Test</h2>

      <div style={{ marginBottom: '30px' }}>
        <h3>Basic Zoom Slider</h3>
        <ZoomSlider
          label="Basic Zoom"
          min={0.5}
          max={3.0}
          step={0.1}
          defaultValue={1.0}
          onChange={setZoomValue}
        />
        <p>Current value: {zoomValue.toFixed(1)}x</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Scale Slider (10-500)</h3>
        <ZoomSlider
          label="Scale"
          min={10}
          max={500}
          step={10}
          defaultValue={100}
          onChange={setScaleValue}
          formatValue={value => `${value}%`}
        />
        <p>Current scale: {scaleValue}%</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Percentage Slider (0-100)</h3>
        <ZoomSlider
          label="Percentage"
          min={0}
          max={100}
          step={5}
          defaultValue={50}
          onChange={setPercentValue}
          formatValue={value => `${value}%`}
        />
        <p>Current percentage: {percentValue}%</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>Disabled Slider</h3>
        <ZoomSlider label="Disabled" disabled={true} defaultValue={1.5} />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>No Value Display</h3>
        <ZoomSlider label="Hidden Value" showValue={false} defaultValue={2.0} />
      </div>
    </div>
  );
};

export default ZoomSliderTest;
