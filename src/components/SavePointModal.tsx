import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import './SavePointModal.css';

interface SavePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
  defaultLabel?: string;
}

export const SavePointModal: React.FC<SavePointModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultLabel = '',
}) => {
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    setLabel(defaultLabel);
  }, [defaultLabel, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onSave(label.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Point" className="save-point-modal">
      <form onSubmit={handleSubmit} className="save-point-form" onKeyDown={handleKeyDown}>
        <div className="form-field">
          <label htmlFor="point-label">Point Name:</label>
          <input
            id="point-label"
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Enter a name for this point"
            autoFocus
            maxLength={50}
          />
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button type="submit" disabled={!label.trim()} className="save-button">
            Save Point
          </button>
        </div>
      </form>
    </Modal>
  );
};
