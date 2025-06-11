import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPage from './PrivacyPage';

describe('PrivacyPage', () => {
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>
    );
  };

  it('renders privacy policy title', () => {
    renderPage();

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders all privacy sections', () => {
    renderPage();

    // Check for main sections
    expect(screen.getByText('Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('Cryptographic Privacy')).toBeInTheDocument();
    expect(screen.getByText('Local Storage')).toBeInTheDocument();
    expect(screen.getByText('Third-Party Services')).toBeInTheDocument();
    expect(screen.getByText('Data Security')).toBeInTheDocument();
  });

  it('renders navigation link', () => {
    renderPage();

    const homeLink = screen.getByRole('link', { name: /back to game/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('includes last updated date', () => {
    renderPage();

    expect(screen.getByText(/Last Updated:/)).toBeInTheDocument();
  });
});
