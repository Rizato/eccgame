import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createTestStore } from '../utils/testUtils';
import { HowToPlayModal } from './HowToPlayModal';

const renderWithStore = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>{component}</MemoryRouter>
    </Provider>
  );
};

describe('HowToPlayModal', () => {
  it('should render when open', () => {
    renderWithStore(<HowToPlayModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('How to Play?')).toBeInTheDocument();
    expect(screen.getByText('Try your luck at solving the impossible!')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = renderWithStore(<HowToPlayModal isOpen={false} onClose={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    renderWithStore(<HowToPlayModal isOpen={true} onClose={onCloseMock} />);

    const closeButton = screen.getByLabelText('Close modal');
    closeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should navigate when mode buttons are clicked', () => {
    const onCloseMock = vi.fn();
    renderWithStore(<HowToPlayModal isOpen={true} onClose={onCloseMock} />);

    const dailyModeButton = screen.getByText('Play Daily Mode →');
    dailyModeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
