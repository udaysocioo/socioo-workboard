import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-black text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            {/* We render the Outlet with the location key to trigger transitions */}
            <div key={location.pathname} className="h-full">
              <Outlet />
            </div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
