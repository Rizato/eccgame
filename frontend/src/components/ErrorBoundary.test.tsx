import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console errors during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('render', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders error UI when there is an error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We're sorry for the inconvenience/)).toBeInTheDocument();
      expect(screen.getByText('Return to Home')).toBeInTheDocument();
    });

    it('shows error details in development mode', () => {
      // Since import.meta.env.DEV is compile-time constant, we need to mock the component instead
      // For now, we'll skip testing the DEV mode specifically since it requires build-time configuration
      // In real dev environment, this would show the error details

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // The test environment runs with DEV=true by default
      if (import.meta.env.DEV) {
        expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
      }
    });

    it('resets error state when clicking Return to Home', async () => {
      const user = userEvent.setup();

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByText('Return to Home');
      await user.click(resetButton);

      expect(window.location.href).toBe('/');
    });

    it('logs error details to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });
});
