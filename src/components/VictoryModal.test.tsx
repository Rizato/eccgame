import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { createTestStore } from '../utils/testUtils';
import { VictoryModal } from './VictoryModal';
import type { ReactNode } from 'react';

// Helper function to render with provider
const renderWithProvider = (ui: ReactNode) => {
  const store = createTestStore();
  // Set initial UI state that the original test expected
  store.dispatch({
    type: 'ui/setPrivateKeyDisplayMode',
    payload: 'decimal',
  });
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('VictoryModal', () => {
  const createDefaultProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    operationCount: 5,
    savedPoints: [],
    victoryPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
    isPracticeMode: false,
    gaveUp: false,
    signature: 'mock-signature',
    challenge: {
      id: 1,
      p2pkh_address: '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
      public_key: 'test-public-key',
      tags: [],
    },
  });

  it('should render victory modal when open', () => {
    renderWithProvider(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('🏆 Private Key Found!')).toBeInTheDocument();
    expect(
      screen.getByText('Incredible! You successfully found the private key from the public key.')
    ).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const props = { ...createDefaultProps(), isOpen: false };
    const { container } = renderWithProvider(<VictoryModal {...props} />);

    expect(container.firstChild).toBeNull();
  });

  it('should not render when challenge is null', () => {
    const props = { ...createDefaultProps(), challenge: null };
    const { container } = renderWithProvider(<VictoryModal {...props} />);

    expect(container.firstChild).toBeNull();
  });

  it('should display correct stats', () => {
    renderWithProvider(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('Point Operations')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).toBeInTheDocument();
    expect(screen.getByText('Private Key')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should show practice mode content when isPracticeMode is true', () => {
    const props = { ...createDefaultProps(), isPracticeMode: true };
    renderWithProvider(<VictoryModal {...props} />);

    expect(screen.getByText('🏆 Practice Complete!')).toBeInTheDocument();
    expect(
      screen.getByText('Great work! You successfully solved the practice private key.')
    ).toBeInTheDocument();
    expect(screen.getByText('Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Share Result')).toBeInTheDocument();
  });

  it('should show challenge mode content when isPracticeMode is false', () => {
    renderWithProvider(<VictoryModal {...createDefaultProps()} />);

    expect(screen.getByText('🏆 Private Key Found!')).toBeInTheDocument();
    expect(
      screen.getByText('Incredible! You successfully found the private key from the public key.')
    ).toBeInTheDocument();
    expect(screen.getByText('Wallet Address')).toBeInTheDocument();
    expect(screen.getByText('Share Result')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    renderWithProvider(<VictoryModal {...props} />);

    const closeButton = screen.getByLabelText('Close modal');
    closeButton.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    renderWithProvider(<VictoryModal {...props} />);

    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    overlay?.click();

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when modal content is clicked', () => {
    const onCloseMock = vi.fn();
    const props = { ...createDefaultProps(), onClose: onCloseMock };
    renderWithProvider(<VictoryModal {...props} />);

    const modal = document.querySelector('.victory-modal') as HTMLElement;
    modal?.click();

    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('should render share button with correct initial text', () => {
    renderWithProvider(<VictoryModal {...createDefaultProps()} />);

    const shareButton = screen.getByText('Share Result');
    expect(shareButton).toBeInTheDocument();
    expect(shareButton).toHaveClass('victory-share-button');
  });

  it('should show gave up state when gaveUp is true', () => {
    const props = { ...createDefaultProps(), gaveUp: true };
    renderWithProvider(<VictoryModal {...props} />);

    expect(screen.getByText('🤷 Gave Up.')).toBeInTheDocument();
    expect(screen.getByText("Don't feel bad, this is literally impossible.")).toBeInTheDocument();
    expect(screen.queryByText('Private Key')).not.toBeInTheDocument();
  });

  it('should show victory state when gaveUp is false', () => {
    const props = { ...createDefaultProps(), gaveUp: false };
    renderWithProvider(<VictoryModal {...props} />);

    expect(screen.getByText('🏆 Private Key Found!')).toBeInTheDocument();
    expect(screen.getByText('Private Key')).toBeInTheDocument();
  });
});
