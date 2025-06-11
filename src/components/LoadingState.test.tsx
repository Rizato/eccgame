import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingState from './LoadingState';

describe('LoadingState', () => {
  it('renders loading spinner and text', () => {
    render(<LoadingState />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const loadingContainer = screen.getByText('Loading...').parentElement;
    expect(loadingContainer).toHaveClass('loading-state');

    // Check for spinner element
    const spinner = loadingContainer?.querySelector('.loading-spinner');
    expect(spinner).toBeInTheDocument();
  });
});
