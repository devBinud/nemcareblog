import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: Desktop + Drawer */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 md:w-1/5`}>
        <Sidebar closeSidebar={closeSidebar} />
      </div>

      {/* Main content */}
      {/* <div className="flex-1 flex flex-col md:w-4/5 w-full ml-0 md:ml-[20%]"> */}
      <div className="w-full md:w-4/5 flex flex-col">
        <Header toggleSidebar={toggleSidebar} />
<main className="flex-1 overflow-y-auto">
  <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg bg-gradient-to-br from-white/20 via-white/10 to-transparent">
    <Outlet />
  </div>
</main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
