import { useEffect, useState } from "react";

const useCheckScreenSize = () => {
  // Start with safe defaults (assume large screen, landscape)
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Debug flag (set to false in production)
  const DEBUG = false;

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") {
      DEBUG && console.error('[useCheckScreenSize] window is undefined (SSR)');
      return () => {};
    }

    DEBUG && console.log('[useCheckScreenSize] Initializing screen size check');

    const checkScreenWidth = () => {
      const width = window.innerWidth; // Use innerWidth for viewport size
      const newIsSmallScreen = width < 750;
      setIsSmallScreen(newIsSmallScreen);
      DEBUG && console.log(`[useCheckScreenSize] checkScreenWidth: innerWidth=${width}, isSmallScreen=${newIsSmallScreen}`);
    };

    const checkOrientation = (e) => {
      const newIsPortrait = e.matches;
      setIsPortrait(newIsPortrait);
      DEBUG && console.log(`[useCheckScreenSize] checkOrientation: isPortrait=${newIsPortrait}`);
    };

    // Initial checks
    checkScreenWidth();

    const orientationMediaQuery = window.matchMedia('(orientation: portrait)');
    setIsPortrait(orientationMediaQuery.matches);
    DEBUG && console.log(`[useCheckScreenSize] Initial orientation: isPortrait=${orientationMediaQuery.matches}`);

    // Listen for resize events
    window.addEventListener("resize", checkScreenWidth);

    // Listen for orientation changes
    orientationMediaQuery.addEventListener('change', checkOrientation);

    // Clean up event listeners
    return () => {
      DEBUG && console.log('[useCheckScreenSize] Cleaning up event listeners');
      window.removeEventListener("resize", checkScreenWidth);
      orientationMediaQuery.removeEventListener('change', checkOrientation);
    };
  }, []);

  return { isSmallScreen, isPortrait };
};

export default useCheckScreenSize;
