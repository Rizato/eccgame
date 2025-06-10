import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SavedPoint } from '../../types/ecc';

interface SavedPointsState {
  byId: Record<string, SavedPoint>;
  allIds: string[];
}

const initialState: SavedPointsState = {
  byId: {},
  allIds: [],
};

const savedPointsSlice = createSlice({
  name: 'savedPoints',
  initialState,
  reducers: {
    addSavedPoint: (state, action: PayloadAction<SavedPoint>) => {
      const point = action.payload;
      state.byId[point.id] = point;
      if (!state.allIds.includes(point.id)) {
        state.allIds.push(point.id);
      }
    },

    removeSavedPoint: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(pointId => pointId !== id);
    },

    updateSavedPoint: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<SavedPoint> }>
    ) => {
      const { id, updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },

    setSavedPoints: (state, action: PayloadAction<SavedPoint[]>) => {
      const points = action.payload;
      state.byId = {};
      state.allIds = [];

      for (const point of points) {
        state.byId[point.id] = point;
        state.allIds.push(point.id);
      }
    },

    clearSavedPoints: () => initialState,

    batchAddSavedPoints: (state, action: PayloadAction<SavedPoint[]>) => {
      for (const point of action.payload) {
        state.byId[point.id] = point;
        if (!state.allIds.includes(point.id)) {
          state.allIds.push(point.id);
        }
      }
    },
  },
});

export const {
  addSavedPoint,
  removeSavedPoint,
  updateSavedPoint,
  setSavedPoints,
  clearSavedPoints,
  batchAddSavedPoints,
} = savedPointsSlice.actions;

export default savedPointsSlice.reducer;

// Selectors
export const selectAllSavedPoints = (state: { savedPoints: SavedPointsState }): SavedPoint[] =>
  state.savedPoints.allIds.map(id => state.savedPoints.byId[id]);

export const selectSavedPointById = (
  state: { savedPoints: SavedPointsState },
  id: string
): SavedPoint | undefined => state.savedPoints.byId[id];

export const selectSavedPointsCount = (state: { savedPoints: SavedPointsState }): number =>
  state.savedPoints.allIds.length;

export const selectSavedPointsByTimestamp = (state: {
  savedPoints: SavedPointsState;
}): SavedPoint[] => {
  const points = selectAllSavedPoints(state);
  return [...points].sort((a, b) => b.timestamp - a.timestamp);
};
