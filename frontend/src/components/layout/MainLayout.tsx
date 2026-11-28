/** Main layout wrapper with sidebar and header. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/stores/appStore';

const SIDEBAR_EXPANDED_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 72;

export function MainLayout({ startupReady = true }: { startupReady?: boolean }) {
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useAppStore();
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef(pathname);
  const prevHashRef = useRef(hash);
  const currentKeyRef = useRef(key);
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [tabletCollapsedOverride, setTabletCollapsedOverride] = useState<boolean | null>(null);

  // Track scroll position per history entry key so Back/Forward can restore it reliably
  useEffect(() => {
    const handleScroll = () => {
      scrollPositionsRef.current.set(currentKeyRef.current, window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset scroll on fresh pathname navigation; restore saved scroll on POP; respect hash anchors
  useEffect(() => {
    currentKeyRef.current = key;
    const pathnameChanged = prevPathnameRef.current !== pathname;
    const hashChanged = prevHashRef.current !== hash;
    prevPathnameRef.current = pathname;
    prevHashRef.current = hash;

    if (!pathnameChanged && !hashChanged) return;

    if (pathnameChanged && navigationType === 'POP') {
      const savedY = scrollPositionsRef.current.get(key) ?? 0;
      window.scrollTo({ top: savedY, left: 0, behavior: 'auto' });
      if (savedY <= 0) return;

      // Retry briefly in case lazy route or cached query renders asynchronously
      let cancelled = false;
      const onUserScroll = () => { cancelled = true; };
      window.addEventListener('wheel', onUserScroll, { once: true, passive: true });
      window.addEventListener('touchstart', onUserScroll, { once: true, passive: true });

      const t1 = window.setTimeout(() => {
        if (!cancelled && Math.abs(window.scrollY - savedY) > 4) {
          window.scrollTo({ top: savedY, left: 0, behavior: 'auto' });
        }
      }, 80);
      const t2 = window.setTimeout(() => {
        if (!cancelled && Math.abs(window.scrollY - savedY) > 4) {
          window.scrollTo({ top: savedY, left: 0, behavior: 'auto' });
        }
      }, 220);

      return () => {
        cancelled = true;
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.removeEventListener('wheel', onUserScroll);
        window.removeEventListener('touchstart', onUserScroll);
      };
    }

    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'auto' });
        return;
      }
    }

    if (pathnameChanged) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [pathname, hash, key, navigationType]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      if (width < 768 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
      if (width >= 1024) {
        setTabletCollapsedOverride(null);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024;

  // At tablet widths (768-1023px), default to collapsed rail so the workspace keeps >=696px,
  // while preserving the user's persisted desktop preference in appStore.
  const effectiveCollapsed = isMobile
    ? sidebarCollapsed
    : isTablet
      ? (tabletCollapsedOverride ?? true)
      : sidebarCollapsed;

  const handleToggleSidebar = useCallback(() => {
    if (isTablet) {
      setTabletCollapsedOverride((prev) => !(prev ?? true));
    } else {
      toggleSidebar();
    }
  }, [isTablet, toggleSidebar]);

  const sidebarWidth = isMobile
    ? (effectiveCollapsed ? 0 : SIDEBAR_EXPANDED_WIDTH)
    : (effectiveCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH);

  const marginLeft = isMobile ? 0 : sidebarWidth;

  return (
    <div
      inert={!startupReady}
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className={`min-h-screen bg-ds-canvas text-ds-text-primary antialiased ${startupReady ? 'titan-app-ready' : 'titan-app-starting'}`}
    >
      <Sidebar
        isMobile={isMobile}
        collapsed={effectiveCollapsed}
        width={sidebarWidth}
        onToggle={handleToggleSidebar}
        onCloseMobile={() => setSidebarCollapsed(true)}
      />
      <div
        style={{ marginLeft }}
        className="flex flex-col min-h-screen min-w-0 transition-[margin-left] duration-200 ease-[cubic-bezier(0.28,0.11,0.32,1)] motion-reduce:transition-none"
      >
        <Header onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-6 sm:pb-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
