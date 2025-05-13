import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import logo from '../../src/assets/img/logo.png';

const routeTitles = {
  '/': '',
  '/users': '',
  '/edit-blog': '',
  '/settings': '',
  // Add more as needed
};

const Header = ({ toggleSidebar }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentTitle = routeTitles[location.pathname] || 'Admin Panel';

  return (
    <div className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-200 bg-white">
      
      {/* Sidebar Toggle Button */}
      <button onClick={toggleSidebar} className="md:hidden text-2xl text-[#960c0c]">
        <FiMenu />
      </button>

      {/* Logo on Mobile */}
      <img
        src={logo}
        alt="Logo"
        className="h-8 md:hidden"
      />

      {/* Title */}
      <h1 className="hidden md:block text-lg font-semibold text-gray-800">
        {currentTitle}
      </h1>

      {/* Logout Button */}
<button
  onClick={handleLogout}
  className="flex items-center gap-2 border-2 border-[#960c0c] text-[#960c0c] font-bold px-4 py-1 rounded-md hover:bg-[#b91c1c] hover:text-white hover:border-[#b91c1c] transition-all duration-300 text-sm cursor-pointer"
>
  <FiLogOut className="text-base" />
  Logout
</button>


    </div>
  );
};

export default Header;
