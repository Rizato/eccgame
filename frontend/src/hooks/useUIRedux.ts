import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setShowHowToPlayModal,
  openHowToPlayModal,
  closeHowToPlayModal,
  setShowMobileNav,
  openMobileNav,
  closeMobileNav,
  setShowErrorBanner,
  toggleHowToPlayModal,
  setShowVictoryModal,
  openVictoryModal,
  closeVictoryModal,
  selectShowHowToPlayModal,
  selectShowMobileNav,
  selectShowErrorBanner,
  selectShowVictoryModal,
} from '../store/slices/uiSlice';

export const useUIRedux = () => {
  const dispatch = useAppDispatch();

  // Selectors
  const showHowToPlayModal = useAppSelector(selectShowHowToPlayModal);
  const showMobileNav = useAppSelector(selectShowMobileNav);
  const showErrorBanner = useAppSelector(selectShowErrorBanner);
  const showVictoryModal = useAppSelector(selectShowVictoryModal);

  // Actions
  const setHowToPlayModal = (show: boolean) => {
    dispatch(setShowHowToPlayModal(show));
  };

  const openHowToPlay = () => {
    dispatch(openHowToPlayModal());
  };

  const closeHowToPlay = () => {
    dispatch(closeHowToPlayModal());
  };

  const setMobileNav = (show: boolean) => {
    dispatch(setShowMobileNav(show));
  };

  const openMobileNavigation = () => {
    dispatch(openMobileNav());
  };

  const closeMobileNavigation = () => {
    dispatch(closeMobileNav());
  };

  const setErrorBanner = (show: boolean) => {
    dispatch(setShowErrorBanner(show));
  };

  const toggleHowToPlay = () => {
    dispatch(toggleHowToPlayModal());
  };

  const setVictoryModal = (show: boolean) => {
    dispatch(setShowVictoryModal(show));
  };

  const openVictory = () => {
    dispatch(openVictoryModal());
  };

  const closeVictory = () => {
    dispatch(closeVictoryModal());
  };

  return {
    // State
    showHowToPlayModal,
    showMobileNav,
    showErrorBanner,
    showVictoryModal,

    // Actions
    setHowToPlayModal,
    openHowToPlay,
    closeHowToPlay,
    setMobileNav,
    openMobileNavigation,
    closeMobileNavigation,
    setErrorBanner,
    toggleHowToPlay,
    setVictoryModal,
    openVictory,
    closeVictory,
  };
};
