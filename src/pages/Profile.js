import React from 'react';
import { FiUser, FiMail, FiShield, FiCpu, FiClock, FiActivity } from 'react-icons/fi';

const Profile = () => {
  return (
    <div className="p-6 md:p-10 bg-[#f3f5f9] min-h-screen font-sans space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-100/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] flex flex-col items-center text-center">
          {/* Avatar Initials Circle */}
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-tr from-[#960c0c] to-[#c51c1c] text-white flex items-center justify-center font-black text-3xl shadow-md mt-4">
            AU
          </div>

          <h3 className="text-lg font-black text-slate-800 tracking-tight mt-5">
            Admin User
          </h3>
          <p className="text-slate-500 font-semibold text-xs mt-1 uppercase tracking-wider">
            Super Administrator
          </p>

          <div className="w-full border-t border-slate-100 mt-6 pt-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Account Status</span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-100/20 bg-emerald-50 text-emerald-600">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Security Group</span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-red-100/20 bg-red-50 text-[#960c0c]">
                Root Admin
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Console Mode</span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-indigo-100/20 bg-indigo-50 text-indigo-600">
                Production
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Information & System Status */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section 1: Account Details */}
          <div className="bg-white rounded-3xl border border-slate-100/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiUser className="text-[#960c0c] text-base" /> Account Metadata
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiUser className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Full Name</p>
                  <p className="font-bold text-slate-700 mt-0.5">Admin User</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiMail className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Email Address</p>
                  <p className="font-bold text-slate-700 mt-0.5">admin@nemcare.com</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiShield className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Permission Privilege</p>
                  <p className="font-bold text-slate-700 mt-0.5">Root Console Access</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiClock className="text-slate-400 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Account Created</p>
                  <p className="font-bold text-slate-700 mt-0.5">12 May 2026</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Environment Details */}
          <div className="bg-white rounded-3xl border border-slate-100/30 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiCpu className="text-indigo-600 text-base" /> Environment Overview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiActivity className="text-indigo-500 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">System Engine Status</p>
                  <p className="font-bold text-slate-700 mt-0.5">Stable & Fully Functional</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiShield className="text-indigo-500 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Security Certificate</p>
                  <p className="font-bold text-slate-700 mt-0.5">Active (SSL Encrypted)</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiCpu className="text-indigo-500 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Console Build</p>
                  <p className="font-bold text-slate-700 mt-0.5">v1.2.4 (Standard Dev-Stack)</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <FiClock className="text-indigo-500 text-lg shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">System Latency</p>
                  <p className="font-bold text-slate-700 mt-0.5">Minimal (Offline Sandbox)</p>
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
