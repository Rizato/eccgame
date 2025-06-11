import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FAQPage from './FAQPage';

describe('FAQPage', () => {
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <FAQPage />
      </BrowserRouter>
    );
  };

  it('renders FAQ page with title', () => {
    renderPage();

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders all FAQ sections', () => {
    renderPage();

    // Check for main questions
    expect(screen.getByText('Why does this exist?')).toBeInTheDocument();
    expect(screen.getByText('How does the game work?')).toBeInTheDocument();
    expect(screen.getByText('Can I actually win Bitcoin from playing?')).toBeInTheDocument();
    expect(screen.getByText('Why keep playing if nobody can win?')).toBeInTheDocument();
    expect(screen.getByText('Is this ethical?')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderPage();

    const homeLink = screen.getByRole('link', { name: /back to game/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
