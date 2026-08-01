import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import logo from '../../src/assets/img/logo.png';

const Header = ({ toggleSidebar }) => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isReceptionist = role === 'receptionist';

  // Determine page title dynamically
  let currentTitle = 'Control Panel';
  const path = location.pathname;
  if (path === '/') {
    currentTitle = isReceptionist ? 'Appointments Portal' : 'Appointments Dashboard';
  } else if (path === '/availability') {
    currentTitle = 'Doctor Availability Calendar';
  } else if (path === '/users') {
    currentTitle = 'Authors & Users';
  } else if (path === '/blogs/new') {
    currentTitle = 'Create Blog Post';
  } else if (path === '/blogs') {
    currentTitle = 'All Blog Posts';
  } else if (path.includes('/blogs/edit/')) {
    currentTitle = 'Edit Blog Post';
  } else if (path.includes('/blogs/')) {
    currentTitle = 'Article Details';
  } else if (path === '/profile') {
    currentTitle = 'My Profile';
  } else if (path === '/signup') {
    currentTitle = 'Create Receptionist Account';
  } else if (path === '/departments') {
    currentTitle = 'All Departments';
  } else if (path === '/departments/new') {
    currentTitle = 'Add Department';
  } else if (path === '/doctors') {
    currentTitle = 'All Doctors';
  } else if (path === '/doctors/new') {
    currentTitle = 'Add Doctor Profile';
  } else if (path === '/slots') {
    currentTitle = 'Master Time Slots';
  } else if (path === '/dashboard') {
    currentTitle = 'System Dashboard';
  }

  return (
    <div className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white shadow-xs">

      {/* Sidebar Toggle Button (Mobile only) */}
      <button
        onClick={toggleSidebar}
        className="md:hidden text-2xl text-slate-600 hover:text-[#960c0c] p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        aria-label="Toggle Sidebar"
      >
        <FiMenu />
      </button>

      {/* Logo on Mobile */}
      <img
        src={logo}
        alt="Logo"
        className="h-8 md:hidden object-contain"
      />

      {/* Title */}
      <div className="hidden md:flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl hover:bg-[#960c0c] hover:text-white hover:border-[#960c0c] transition-all duration-300 text-xs md:text-sm cursor-pointer shadow-xs hover:shadow-md hover:shadow-red-900/10 active:scale-95"
        >
          <FiLogOut className="text-base shrink-0" />
          Logout
        </button>
      </div>

    </div>
  );
};

export default Header;
