import React from 'react';
import { FiUser, FiMail, FiShield, FiClock, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, role } = useAuth();

  const isAdmin = role === 'admin';
  const name = user?.name || (isAdmin ? 'Administrator' : 'Reception Desk Staff');
  const email = user?.email || (isAdmin ? 'admin@nemcare.com' : 'reception@nemcare.com');
  const roleTitle = isAdmin ? 'Hospital Administrator' : 'Reception Desk Staff';
  const securityGroup = isAdmin ? 'System Admin' : 'Receptionist Staff';
  const privilege = isAdmin ? 'Full Control Access' : 'Reception & Appointments Desk Access';

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="p-6 md:p-10 bg-[#f3f5f9] min-h-screen font-sans space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-100/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] flex flex-col items-center text-center">
          {/* Avatar Initials Circle */}
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-[#960c0c] to-[#c51c1c] text-white flex items-center justify-center font-black text-3xl shadow-md mt-4">
            {initials}
          </div>

          <h3 className="text-lg font-black text-slate-800 tracking-tight mt-5">
            {name}
          </h3>
          <p className="text-slate-500 font-semibold text-xs mt-1 uppercase tracking-wider">
            {roleTitle}
          </p>

          <div className="w-full border-t border-slate-100 mt-6 pt-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Account Status</span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-100/20 bg-emerald-50 text-emerald-600 flex items-center gap-1">
                <FiCheckCircle className="text-[10px]" /> Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Assigned Role</span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                isAdmin ? 'border-red-100 bg-red-50 text-[#960c0c]' : 'border-indigo-100 bg-indigo-50 text-indigo-700'
              }`}>
                {securityGroup}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Information */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Account Details */}
          <div className="bg-white rounded-3xl border border-slate-100/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiUser className="text-[#960c0c] text-base" /> Account Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiUser className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Full Name</p>
                  <p className="font-bold text-slate-800 mt-0.5">{name}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiMail className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Email / Username</p>
                  <p className="font-bold text-slate-800 mt-0.5">{email}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiShield className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Access Privilege</p>
                  <p className="font-bold text-slate-800 mt-0.5">{privilege}</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiClock className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Account Status</p>
                  <p className="font-bold text-emerald-600 mt-0.5">Verified & Active</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;

