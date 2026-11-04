import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

interface ScrollPosition {
  x: number;
  y: number;
  regions: Record<string, { x: number; y: number }>;
}

const positions = new Map<string, ScrollPosition>();
const regionSelector = '[data-scroll-region]';
export const PageScrollContext = createContext<{ container?: RefObject<HTMLElement | null>; suspended?: boolean }>({});

// Restore only after the page's data has rendered; a loading placeholder is
// often too short to accept the saved scroll offset.
export function usePageScrollRestoration(ready: boolean) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { container, suspended } = useContext(PageScrollContext);
  const previous = useRef<{ pathname: string; position: ScrollPosition } | null>(null);

  useLayoutEffect(() => {
    if (!ready || suspended) return;
    const root = container?.current || document;
    const scroller = container?.current || window;
    const saved = positions.get(location.key)
      || (navigationType === 'REPLACE' && previous.current?.pathname === location.pathname ? previous.current.position : null);

    const restore = () => {
      scroller.scrollTo({ left: saved?.x || 0, top: saved?.y || 0, behavior: 'instant' });
      root.querySelectorAll<HTMLElement>(regionSelector).forEach((region) => {
        const offset = saved?.regions[region.dataset.scrollRegion!];
        region.scrollTo({ left: offset?.x || 0, top: offset?.y || 0, behavior: 'instant' });
      });
    };
    const remember = () => {
      const position: ScrollPosition = { x: container?.current?.scrollLeft ?? window.scrollX, y: container?.current?.scrollTop ?? window.scrollY, regions: {} };
      root.querySelectorAll<HTMLElement>(regionSelector).forEach((region) => {
        position.regions[region.dataset.scrollRegion!] = { x: region.scrollLeft, y: region.scrollTop };
      });
      positions.set(location.key, position);
      previous.current = { pathname: location.pathname, position };
    };

    restore();
    remember();
    const frame = requestAnimationFrame(() => { restore(); remember(); });
    // Capture nested scroll containers as well as window scrolling. Record
    // before a navigation click, rather than after the old DOM is removed.
    root.addEventListener('scroll', remember, true);
    root.addEventListener('pointerdown', remember, true);
    root.addEventListener('keydown', remember, true);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', remember, true);
      root.removeEventListener('pointerdown', remember, true);
      root.removeEventListener('keydown', remember, true);
    };
  }, [ready, location.key, location.pathname, navigationType, container, suspended]);
}
