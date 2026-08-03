import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiHome, FiUsers, FiPlusSquare, FiFileText, FiUser, FiChevronRight, FiCalendar, FiClock, FiCheckSquare, FiBriefcase, FiLayers } from 'react-icons/fi';
import Logo from '../assets/img/logo.png';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ closeSidebar }) => {
  const { role, user } = useAuth();
  const isReceptionist = role === 'receptionist';

  const linkClasses = ({ isActive }) =>
    `relative flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 ease-in-out font-semibold text-[12.5px] group ${isActive
      ? isReceptionist ? 'bg-indigo-50 text-indigo-700 font-extrabold' : 'bg-[#960c0c]/5 text-[#960c0c]'
      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
    }`;

  const activeIconColor = isReceptionist ? 'text-indigo-700' : 'text-[#960c0c]';

  return (
    <div className="h-full flex flex-col p-5 bg-[#fcfdfd] border-r border-slate-100/60">
      {/* Brand/Logo Header — with clean text role label directly under logo */}
      <div className="flex flex-col items-center justify-center mb-5 pb-3 border-b border-slate-100/60 shrink-0">
        <img src={Logo} alt="Nemcare Logo" className="h-12 object-contain mb-1.5" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {isReceptionist ? 'Receptionist Desk' : 'Administrator'}
        </span>
      </div>

      {/* Scrollable Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-6 pr-0.5 scrollbar-thin">
        {/* Appointment System Section */}
        <div>
          <span className="text-[9.5px] font-semibold text-slate-400/80 uppercase tracking-widest block px-4 mb-2.5">
            Appointment System
          </span>
          <nav className="flex flex-col gap-1">
            <NavLink to="/" end className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiCalendar className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>Appointments</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            <NavLink to="/availability" className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiCheckSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>Availability</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            <NavLink to="/departments" end className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiLayers className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>All Departments</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            <NavLink to="/departments/new" className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiPlusSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>Add Department</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            <NavLink to="/doctors" end className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiBriefcase className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>All Doctors</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            <NavLink to="/doctors/new" className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiPlusSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>Add Doctor</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            {!isReceptionist && (
              <NavLink to="/slots" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiClock className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Master Time Slots</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            )}
          </nav>
        </div>

        {/* Main Sections — Admin Only */}
        {!isReceptionist && (
          <div>
            <span className="text-[9.5px] font-semibold text-slate-400/80 uppercase tracking-widest block px-4 mb-2.5">
              Overview
            </span>
            <nav className="flex flex-col gap-1">
              <NavLink to="/dashboard" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiHome className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Dashboard</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/blogs" end className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiFileText className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>All Blogs</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/blogs/new" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiPlusSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Add New Blogpost</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
              <NavLink to="/users" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiUsers className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Authors</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        )}

        {/* Management Section */}
        <div>
          <span className="text-[9.5px] font-semibold text-slate-400/80 uppercase tracking-widest block px-4 mb-2.5">
            Management
          </span>
          <nav className="flex flex-col gap-1">
            <NavLink to="/profile" className={linkClasses} onClick={closeSidebar}>
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <FiUser className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                    <span>My Profile</span>
                  </div>
                  <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                </>
              )}
            </NavLink>

            {!isReceptionist && (
              <NavLink to="/signup" className={linkClasses} onClick={closeSidebar}>
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <FiPlusSquare className={`text-base shrink-0 transition-all duration-300 group-hover:scale-110 ${isActive ? activeIconColor : 'text-slate-400 group-hover:text-slate-650'}`} />
                      <span>Create Receptionist</span>
                    </div>
                    <FiChevronRight className={`text-xs shrink-0 transition-transform duration-300 ${isActive ? activeIconColor : 'text-slate-350 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </NavLink>
            )}
          </nav>
        </div>
      </div>

      {/* Profile Widget — pinned at bottom */}
      <div className="shrink-0 mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 bg-slate-50/40 p-2.5 rounded-xl border border-slate-100/50 hover:bg-slate-50 transition-colors duration-300">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shadow-3xs ${
          isReceptionist
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
            : 'bg-[#960c0c]/10 text-[#960c0c]'
        }`}>
          {isReceptionist ? 'R' : 'A'}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-slate-700 truncate">
            {isReceptionist ? (user?.name || 'Reception Desk') : (user?.name || 'Administrator')}
          </span>
          <span className="text-[10px] text-slate-400 truncate">
            {user?.email || (isReceptionist ? 'reception@nemcare.com' : 'admin@nemcare.com')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
