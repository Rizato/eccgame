import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  addSavedPoint,
  removeSavedPoint,
  updateSavedPoint,
  setSavedPoints,
  clearSavedPoints,
  batchAddSavedPoints,
  selectAllSavedPoints,
  selectSavedPointById,
  selectSavedPointsCount,
  selectSavedPointsByTimestamp,
} from '../store/slices/savedPointsSlice';
import type { SavedPoint } from '../types/ecc';

export const useSavedPointsRedux = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const allSavedPoints = useAppSelector(selectAllSavedPoints);
  const savedPointsCount = useAppSelector(selectSavedPointsCount);
  const savedPointsByTimestamp = useAppSelector(selectSavedPointsByTimestamp);

  // Actions
  const addPoint = (point: SavedPoint) => {
    dispatch(addSavedPoint(point));
  };

  const removePoint = (id: string) => {
    dispatch(removeSavedPoint(id));
  };

  const updatePoint = (id: string, updates: Partial<SavedPoint>) => {
    dispatch(updateSavedPoint({ id, updates }));
  };

  const setPoints = (points: SavedPoint[]) => {
    dispatch(setSavedPoints(points));
  };

  const clearPoints = () => {
    dispatch(clearSavedPoints());
  };

  const batchAddPoints = (points: SavedPoint[]) => {
    dispatch(batchAddSavedPoints(points));
  };

  // Helper selector that takes parameters
  const getPointById = (id: string) => useAppSelector(state => selectSavedPointById(state, id));

  return {
    // State
    allSavedPoints,
    savedPointsCount,
    savedPointsByTimestamp,

    // Actions
    addPoint,
    removePoint,
    updatePoint,
    setPoints,
    clearPoints,
    batchAddPoints,

    // Helper selectors
    getPointById,
  };
};
