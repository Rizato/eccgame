import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import gameSlice from '../store/slices/gameSlice';
import { HowToPlayModal } from './HowToPlayModal';

// Create a test store
const createTestStore = () =>
  configureStore({
    reducer: {
      game: gameSlice,
    },
  });

const renderWithStore = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(<Provider store={store}>{component}</Provider>);
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

    const closeButton = screen.getByLabelText('Close');
    closeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Got it button is clicked', () => {
    const onCloseMock = vi.fn();
    renderWithStore(<HowToPlayModal isOpen={true} onClose={onCloseMock} />);

    const gotItButton = screen.getByText('Play Daily Mode →');
    gotItButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
