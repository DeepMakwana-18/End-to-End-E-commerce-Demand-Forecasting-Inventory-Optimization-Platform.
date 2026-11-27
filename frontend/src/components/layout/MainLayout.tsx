/** Main layout wrapper with sidebar and header. */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/stores/appStore';

export function MainLayout() {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const marginLeft = isMobile ? 0 : (sidebarCollapsed ? 72 : 260);

  return (
    <div className="min-h-screen bg-ds-canvas text-ds-text-primary antialiased">
      <Sidebar />
      <div
        style={{ marginLeft }}
        className="flex flex-col min-h-screen min-w-0 transition-[margin-left] duration-200 ease-out motion-reduce:transition-none"
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-24 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
