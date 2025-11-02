import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

interface ScreenInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useMobile(): ScreenInfo {
  const [screenInfo, setScreenInfo] = React.useState<ScreenInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        width: 1024,
        height: 768,
        deviceType: 'desktop' as const
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const isDesktop = width >= TABLET_BREAKPOINT;

    return {
      isMobile,
      isTablet,
      isDesktop,
      width,
      height,
      deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    };
  });

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < MOBILE_BREAKPOINT;
      const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
      const isDesktop = width >= TABLET_BREAKPOINT;

      setScreenInfo({
        isMobile,
        isTablet,
        isDesktop,
        width,
        height,
        deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Call once on mount to set initial state
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenInfo;
}
