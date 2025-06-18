import React, { type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  showCloseButton?: boolean;
  backdrop?: 'dark' | 'light';
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  showCloseButton = true,
  backdrop = 'dark',
  zIndex = 20000,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`modal-overlay ${backdrop === 'light' ? 'light-backdrop' : ''}`}
      onClick={onClose}
      style={{ zIndex }}
    >
      <div className={`modal ${className}`} onClick={e => e.stopPropagation()}>
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h3 className="modal-title">{title}</h3>}
            {showCloseButton && (
              <button className="modal-close" onClick={onClose} aria-label="Close modal">
                ×
              </button>
            )}
          </div>
        )}
        <div className="modal-content">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
