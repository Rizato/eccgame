import React, { useEffect, useState } from 'react';
import './SavePointModal.css';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  closeSavePointModal,
  selectSavePointModalOpen,
  selectSavePointModalDefaultLabel,
  selectSavePointModalPendingData,
} from '../store/slices/savePointModalSlice';
import { useSavedPointsRedux } from '../hooks/useSavedPointsRedux';
import type { SavedPoint } from '../types/ecc';

export const SavePointModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { addPoint } = useSavedPointsRedux();

  const isOpen = useAppSelector(selectSavePointModalOpen);
  const defaultLabel = useAppSelector(selectSavePointModalDefaultLabel);
  const pendingData = useAppSelector(selectSavePointModalPendingData);

  const onClose = () => dispatch(closeSavePointModal());

  const onSave = (label: string) => {
    if (pendingData?.point) {
      const savedPoint: SavedPoint = {
        id: `saved-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        point: pendingData.point,
        label,
        timestamp: Date.now(),
        privateKey: pendingData.privateKey,
      };
      addPoint(savedPoint);
    }
  };
  const [label, setLabel] = useState(defaultLabel);

  useEffect(() => {
    setLabel(defaultLabel || '');
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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="save-point-modal"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          <h3>Save Point</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="save-point-form">
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
      </div>
    </div>
  );
};
