// iOS viewport height fix
export function setViewportHeight() {
  // First we get the viewport height and multiply it by 1% to get a value for a vh unit
  const vh = window.innerHeight * 0.01;
  // Then we set the value in the --vh custom property to the root of the document
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initialize and add event listeners
export function initViewportFix() {
  // Set the initial height
  setViewportHeight();

  // Update on resize and orientation change
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', setViewportHeight);

  // Also update when the address bar shows/hides on iOS
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setViewportHeight);
  }
}
