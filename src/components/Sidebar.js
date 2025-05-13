import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiPlusSquare, FiFileText, FiSettings } from 'react-icons/fi';
import Logo from '../assets/img/logo.png'; // Adjust the path based on your project structure

const Sidebar = ({ closeSidebar }) => {
  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded transition-colors duration-300 ease-in-out ${
      isActive ? 'bg-[#960c0c] text-white font-semibold' : 'hover:bg-[#960c0c] hover:text-white text-black'
    }`;

  return (
    <div className="h-full p-4 bg-white shadow-md">
      {/* Logo */}
      <div className="flex items-center justify-center mb-6">
        <img src={Logo} alt="Nemcare Logo" className="h-12 object-contain" />
      </div>

      <nav className="flex flex-col gap-2 text-gray-700">
        <NavLink to="/" className={linkClasses} onClick={closeSidebar}>
          <FiHome className="text-lg" />
          Dashboard
        </NavLink>
        <NavLink to="/users" className={linkClasses} onClick={closeSidebar}>
          <FiUsers className="text-lg" />
          Users
        </NavLink>
        <NavLink to="/blogs/new" className={linkClasses} onClick={closeSidebar}>
          <FiPlusSquare className="text-lg" />
          Add Blog
        </NavLink>
        <NavLink to="/blogs" end className={linkClasses} onClick={closeSidebar}>
          <FiFileText className="text-lg" />
          All Blogs
        </NavLink>
      </nav>

      {/* Divider */}
      <div className="border-t border-gray-300 my-6"></div>

      {/* Profile Settings */}
      <div>
        <NavLink 
          to="/profile" 
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors duration-300 ease-in-out hover:bg-[#960c0c] hover:text-white text-black`} 
          onClick={closeSidebar}
        >
          <FiSettings className="text-lg" />
          Profile Settings
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
