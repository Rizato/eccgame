import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VictoryModal } from './VictoryModal';

describe('VictoryModal', () => {
  const createDefaultProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    operationCount: 5,
    challengeAddress: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
    savedPoints: [],
    victoryPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
    isPracticeMode: false,
    gaveUp: false,
  });

  it('should render victory modal when open', () => {
    render(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('Private Key Found! 🎉')).toBeInTheDocument();
    expect(
      screen.getByText('Incredible! You successfully found the private key from the public key.')
    ).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const props = { ...createDefaultProps(), isOpen: false };
    const { container } = render(<VictoryModal {...props} />);

    expect(container.firstChild).toBeNull();
  });

  it('should display correct stats', () => {
    render(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('Operations Used')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Challenge Wallet')).toBeInTheDocument();
    expect(screen.getByText('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBeInTheDocument();
    expect(screen.getByText('Private Key')).toBeInTheDocument();
    expect(
      screen.getByText('0x0000000000000000000000000000000000000000000000000000000000000001')
    ).toBeInTheDocument();
  });

  it('should show practice mode content when isPracticeMode is true', () => {
    const props = { ...createDefaultProps(), isPracticeMode: true };
    render(<VictoryModal {...props} />);

    expect(screen.getByText('Practice Complete! 🎉')).toBeInTheDocument();
    expect(
      screen.getByText('Great work! You successfully solved the practice challenge.')
    ).toBeInTheDocument();
    expect(screen.getByText('Practice Wallet')).toBeInTheDocument();
    expect(screen.getByText('Share Result')).toBeInTheDocument();
  });

  it('should show challenge mode content when isPracticeMode is false', () => {
    render(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('Private Key Found! 🎉')).toBeInTheDocument();
    expect(
      screen.getByText('Incredible! You successfully found the private key from the public key.')
    ).toBeInTheDocument();
    expect(screen.getByText('Challenge Wallet')).toBeInTheDocument();
    expect(screen.getByText('Share Result')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    render(<VictoryModal {...props} />);

    const closeButton = screen.getByLabelText('Close');
    closeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    render(<VictoryModal {...props} />);

    const overlay = document.querySelector('.victory-modal-overlay') as HTMLElement;
    overlay?.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    render(<VictoryModal {...props} />);

    const modal = document.querySelector('.victory-modal') as HTMLElement;
    modal?.click();

    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should render share button with correct initial text', () => {
    render(<VictoryModal {...createDefaultProps()} />);

    const shareButton = screen.getByText('Share Result');
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveClass('victory-share-button');
  });

  it('should show gave up state when gaveUp is true', () => {
    const props = { ...createDefaultProps(), gaveUp: true };
    render(<VictoryModal {...props} />);

    expect(screen.getByText('Challenge Complete! 🤷')).toBeInTheDocument();
    expect(
      screen.getByText('No worries! Even the experts take many attempts. Better luck next time!')
    ).toBeInTheDocument();
    expect(screen.queryByText('Private Key')).not.toBeInTheDocument();
  });

  it('should show victory state when gaveUp is false', () => {
    const props = { ...createDefaultProps(), gaveUp: false };
    render(<VictoryModal {...props} />);

    expect(screen.getByText('Private Key Found! 🎉')).toBeInTheDocument();
    expect(screen.getByText('Private Key')).toBeInTheDocument();
  });
});
