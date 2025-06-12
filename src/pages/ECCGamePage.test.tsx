import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { store } from '../store';
import ECCGamePage from './ECCGamePage';

describe('ECCGamePage', () => {
  const renderPage = (mode: 'daily' | 'practice' = 'daily') => {
    return render(
      <Provider store={store}>
        <BrowserRouter>
          <ECCGamePage mode={mode} />
        </BrowserRouter>
      </Provider>
    );
  };

  it('renders daily mode page', () => {
    renderPage('daily');

    expect(screen.getByText('ECC Game')).toBeInTheDocument();
  });

  it('renders practice mode page', () => {
    renderPage('practice');

    expect(screen.getByText('ECC Game')).toBeInTheDocument();
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
  });

  it('renders game header', () => {
    renderPage();

    // Check for header elements
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });

  it('renders game footer', () => {
    renderPage();

    // Check for footer elements
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('applies correct page structure', () => {
    const { container } = renderPage();

    // Check for main container
    const gamePage = container.firstChild;
    expect(gamePage).toBeInTheDocument();
  });
});
