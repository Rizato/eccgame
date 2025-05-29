import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ZoomSlider from './ZoomSlider';

describe('ZoomSlider', () => {
  const defaultProps = {
    min: 0.1,
    max: 5.0,
    step: 0.1,
    defaultValue: 1.0,
    label: 'Test Zoom',
  };

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<ZoomSlider {...defaultProps} />);

      expect(screen.getByText('Test Zoom:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      expect(screen.getByText('1.0x')).toBeInTheDocument();
    });

    it('should render zoom out button', () => {
      render(<ZoomSlider {...defaultProps} />);

      const zoomOutButton = screen.getByTitle('Zoom out');
      expect(zoomOutButton).toBeInTheDocument();
      expect(zoomOutButton).toHaveTextContent('−');
    });

    it('should render zoom in button', () => {
      render(<ZoomSlider {...defaultProps} />);

      const zoomInButton = screen.getByTitle('Zoom in');
      expect(zoomInButton).toBeInTheDocument();
      expect(zoomInButton).toHaveTextContent('+');
    });

    it('should render reset button', () => {
      render(<ZoomSlider {...defaultProps} />);

      const resetButton = screen.getByTitle('Reset zoom');
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toHaveTextContent('⌂');
    });

    it('should hide value when showValue is false', () => {
      render(<ZoomSlider {...defaultProps} showValue={false} />);

      expect(screen.queryByText('1.0x')).not.toBeInTheDocument();
    });

    it('should use custom formatValue function', () => {
      const formatValue = (value: number) => `${value}%`;
      render(<ZoomSlider {...defaultProps} formatValue={formatValue} />);

      expect(screen.getByText('1%')).toBeInTheDocument();
    });
  });

  describe('slider interaction', () => {
    it('should call onChange when slider value changes', () => {
      render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      const slider = screen.getByDisplayValue('1');
      fireEvent.change(slider, { target: { value: '2.5' } });

      expect(mockOnChange).toHaveBeenCalledWith(2.5);
    });

    it('should update displayed value when slider changes', () => {
      render(<ZoomSlider {...defaultProps} />);

      const slider = screen.getByDisplayValue('1');
      fireEvent.change(slider, { target: { value: '3.2' } });

      expect(screen.getByText('3.2x')).toBeInTheDocument();
    });

    it('should respect min and max bounds', () => {
      render(<ZoomSlider {...defaultProps} />);

      const slider = screen.getByDisplayValue('1') as HTMLInputElement;
      expect(slider.min).toBe('0.1');
      expect(slider.max).toBe('5');
      expect(slider.step).toBe('0.1');
    });
  });

  describe('zoom buttons', () => {
    it('should increase value when zoom in button is clicked', () => {
      render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      const zoomInButton = screen.getByTitle('Zoom in');
      fireEvent.click(zoomInButton);

      expect(mockOnChange).toHaveBeenCalledWith(1.1);
    });

    it('should decrease value when zoom out button is clicked', () => {
      render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      const zoomOutButton = screen.getByTitle('Zoom out');
      fireEvent.click(zoomOutButton);

      expect(mockOnChange).toHaveBeenCalledWith(0.9);
    });

    it('should not exceed maximum value when zooming in', () => {
      render(<ZoomSlider {...defaultProps} defaultValue={5.0} onChange={mockOnChange} />);

      const zoomInButton = screen.getByTitle('Zoom in');
      fireEvent.click(zoomInButton);

      expect(mockOnChange).not.toHaveBeenCalled(); // Should not call onChange at max
    });

    it('should not go below minimum value when zooming out', () => {
      render(<ZoomSlider {...defaultProps} defaultValue={0.1} onChange={mockOnChange} />);

      const zoomOutButton = screen.getByTitle('Zoom out');
      fireEvent.click(zoomOutButton);

      expect(mockOnChange).not.toHaveBeenCalled(); // Should not call onChange at min
    });

    it('should disable zoom in button at maximum value', () => {
      render(<ZoomSlider {...defaultProps} defaultValue={5.0} />);

      const zoomInButton = screen.getByTitle('Zoom in');
      expect(zoomInButton).toBeDisabled();
    });

    it('should disable zoom out button at minimum value', () => {
      render(<ZoomSlider {...defaultProps} defaultValue={0.1} />);

      const zoomOutButton = screen.getByTitle('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });
  });

  describe('reset functionality', () => {
    it('should reset to default value when reset button is clicked', () => {
      render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      // First change the value
      const slider = screen.getByDisplayValue('1');
      fireEvent.change(slider, { target: { value: '3.0' } });

      // Then reset
      const resetButton = screen.getByTitle('Reset zoom');
      fireEvent.click(resetButton);

      expect(mockOnChange).toHaveBeenLastCalledWith(1.0);
    });
  });

  describe('disabled state', () => {
    it('should disable all controls when disabled prop is true', () => {
      render(<ZoomSlider {...defaultProps} disabled={true} />);

      const slider = screen.getByDisplayValue('1');
      const zoomInButton = screen.getByTitle('Zoom in');
      const zoomOutButton = screen.getByTitle('Zoom out');
      const resetButton = screen.getByTitle('Reset zoom');

      expect(slider).toBeDisabled();
      expect(zoomInButton).toBeDisabled();
      expect(zoomOutButton).toBeDisabled();
      expect(resetButton).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      const { rerender } = render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      // Re-render with disabled prop
      rerender(<ZoomSlider {...defaultProps} disabled={true} onChange={mockOnChange} />);

      const slider = screen.getByDisplayValue('1');
      fireEvent.change(slider, { target: { value: '2.0' } });

      // The onChange from initial render might have been called, so we clear and check
      mockOnChange.mockClear();
      fireEvent.change(slider, { target: { value: '3.0' } });
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle very small step values', () => {
      render(<ZoomSlider min={0} max={1} step={0.001} defaultValue={0.5} />);

      const slider = screen.getByDisplayValue('0.5') as HTMLInputElement;
      expect(slider.step).toBe('0.001');
    });

    it('should handle large value ranges', () => {
      render(<ZoomSlider min={1} max={1000} step={1} defaultValue={500} />);

      const slider = screen.getByDisplayValue('500') as HTMLInputElement;
      expect(slider.min).toBe('1');
      expect(slider.max).toBe('1000');
    });

    it('should handle custom formatValue that returns different types', () => {
      const formatValue = (value: number) => `Level ${Math.round(value)}`;
      render(<ZoomSlider {...defaultProps} formatValue={formatValue} />);

      expect(screen.getByText('Level 1')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ZoomSlider {...defaultProps} />);

      const slider = screen.getByDisplayValue('1');
      expect(slider).toHaveAttribute('id', 'zoom-slider-input');

      const label = screen.getByText('Test Zoom:');
      expect(label).toHaveAttribute('for', 'zoom-slider-input');
    });

    it('should be keyboard accessible', () => {
      render(<ZoomSlider {...defaultProps} onChange={mockOnChange} />);

      const slider = screen.getByDisplayValue('1');

      // Test arrow key navigation
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      fireEvent.keyDown(slider, { key: 'ArrowUp' });
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      fireEvent.keyDown(slider, { key: 'ArrowDown' });

      // Slider should be focusable
      slider.focus();
      expect(slider).toHaveFocus();
    });

    it('should have proper button titles for screen readers', () => {
      render(<ZoomSlider {...defaultProps} />);

      expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
      expect(screen.getByTitle('Reset zoom')).toBeInTheDocument();
    });
  });

  describe('logarithmic mode compatibility', () => {
    it('should handle integer step values for logarithmic scale', () => {
      render(<ZoomSlider min={1} max={250} step={1} defaultValue={128} />);

      const slider = screen.getByDisplayValue('128') as HTMLInputElement;
      expect(slider.step).toBe('1');
    });

    it('should work with custom formatValue for powers of 2', () => {
      const formatValue = (value: number) => `2^${Math.round(value)}`;
      render(<ZoomSlider min={1} max={250} step={1} defaultValue={10} formatValue={formatValue} />);

      expect(screen.getByText('2^10')).toBeInTheDocument();
    });

    it('should handle BigInt position formatting', () => {
      const formatValue = () => '0x12345678...abcdef12';
      render(<ZoomSlider {...defaultProps} formatValue={formatValue} />);

      expect(screen.getByText('0x12345678...abcdef12')).toBeInTheDocument();
    });
  });
});
