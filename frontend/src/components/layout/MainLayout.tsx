/** Main layout wrapper with sidebar and header. */

import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  const marginLeft = isMobile ? (sidebarCollapsed ? 0 : 260) : (sidebarCollapsed ? 72 : 260);

  return (
    <div className="min-h-screen bg-ds-canvas text-ds-text-primary antialiased">
      <Sidebar />
      <motion.div
        initial={false}
        animate={{ marginLeft }}
        transition={{ duration: 0.3, ease: [0.28, 0.11, 0.32, 1] }}
        className="flex flex-col min-h-screen min-w-0"
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}
