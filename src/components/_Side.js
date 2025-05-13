import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiPlusSquare, FiFileText } from 'react-icons/fi';

const Sidebar = ({ closeSidebar }) => {
  const linkClasses = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded transition-colors ${isActive ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700'
    }`;

  return (
    <div className="h-full p-4">
      <h2 className="text-2xl font-bold mb-6 ml-5 text-white">Nemcare</h2>
      <nav className="flex flex-col gap-2 text-gray-200">
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
          View Blogs
        </NavLink>

      </nav>
    </div>
  );
};

export default Sidebar;
