import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HowToPlayModal } from './HowToPlayModal';

describe('HowToPlayModal', () => {
  it('should render when open', () => {
    render(<HowToPlayModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('How to Play ECC Game')).toBeInTheDocument();
    expect(screen.getByText('Try your luck at solving the impossible!')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const { container } = render(<HowToPlayModal isOpen={false} onClose={vi.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it('should call onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<HowToPlayModal isOpen={true} onClose={onCloseMock} />);

    const closeButton = screen.getByLabelText('Close');
    closeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Got it button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<HowToPlayModal isOpen={true} onClose={onCloseMock} />);

    const gotItButton = screen.getByText("Got it! Let's Play");
    gotItButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
