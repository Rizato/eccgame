import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface SavePointModalState {
  isOpen: boolean;
  defaultLabel: string;
  pendingPointData: {
    point: { x: bigint; y: bigint; isInfinity?: boolean } | null;
    privateKey?: bigint;
  } | null;
}

const initialState: SavePointModalState = {
  isOpen: false,
  defaultLabel: '',
  pendingPointData: null,
};

const savePointModalSlice = createSlice({
  name: 'savePointModal',
  initialState,
  reducers: {
    openSavePointModal: (
      state,
      action: PayloadAction<{
        defaultLabel?: string;
        point: { x: bigint; y: bigint; isInfinity?: boolean };
        privateKey?: bigint;
      }>
    ) => {
      state.isOpen = true;
      state.defaultLabel = action.payload.defaultLabel || '';
      state.pendingPointData = {
        point: action.payload.point,
        privateKey: action.payload.privateKey,
      };
    },

    closeSavePointModal: state => {
      state.isOpen = false;
      state.defaultLabel = '';
      state.pendingPointData = null;
    },

    setDefaultLabel: (state, action: PayloadAction<string>) => {
      state.defaultLabel = action.payload;
    },
  },
});

export const { openSavePointModal, closeSavePointModal, setDefaultLabel } =
  savePointModalSlice.actions;

export default savePointModalSlice.reducer;

// Selectors
export const selectSavePointModalOpen = (state: { savePointModal: SavePointModalState }) =>
  state.savePointModal.isOpen;
export const selectSavePointModalDefaultLabel = (state: { savePointModal: SavePointModalState }) =>
  state.savePointModal.defaultLabel;
export const selectSavePointModalPendingData = (state: { savePointModal: SavePointModalState }) =>
  state.savePointModal.pendingPointData;
