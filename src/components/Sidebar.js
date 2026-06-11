import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiPlusSquare, FiFileText, FiUser, FiChevronRight, FiCalendar, FiClock, FiCheckSquare, FiBriefcase } from 'react-icons/fi';
import Logo from '../assets/img/logo.png'; // Adjust the path based on your project structure

const Sidebar = ({ closeSidebar }) => {
  const linkClasses = ({ isActive }) =>
    `relative flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 ease-in-out font-bold text-[12.5px] group ${isActive
      ? 'bg-[#960c0c]/8 text-[#960c0c]'
      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
    }`;

  return (
    <div className="h-full flex flex-col justify-between p-5 bg-white border-r border-slate-100">
      <div>
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center justify-center mb-6 border-b border-slate-100/80">
          <img src={Logo} alt="Nemcare Logo" className="h-14 object-contain mb-1" />
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col gap-6">
          {/* Appointment System Section */}
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block px-4 mb-2.5">
              Appointment System
            </span>
            <nav className="flex flex-col gap-1">
              <NavLink to="/" end className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiCalendar className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Appointments</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/doctors" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiBriefcase className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Doctors & Depts</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/slots" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiClock className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Time Slots</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/availability" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiCheckSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Availability</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            </nav>
          </div>

          {/* Main Sections */}
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block px-4 mb-2.5">
              Overview
            </span>
            <nav className="flex flex-col gap-1">
              <NavLink to="/dashboard" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiHome className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Dashboard</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/blogs" end className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiFileText className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>All Blogs</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/blogs/new" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiPlusSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Add New Blogpost</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/users" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiUsers className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Authors</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            </nav>
          </div>

          {/* Admin Sections */}
          <div>
            <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block px-4 mb-2.5">
              Management
            </span>
            <nav className="flex flex-col gap-1">
              <NavLink to="/profile" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiUser className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? 'text-[#960c0c]' : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>My Profile</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? 'text-[#960c0c]/80' : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        </div>
      </div>

      {/* Admin Profile Widget at bottom */}
      <div className="pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors duration-300">
        <div className="h-9 w-9 rounded-xl bg-[#960c0c]/10 text-[#960c0c] flex items-center justify-center font-black text-xs shadow-3xs">
          A
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-slate-700 truncate">Administrator</span>
          <span className="text-[10px] text-slate-400 truncate">admin@nemcare.com</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
