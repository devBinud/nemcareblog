import React, { useState, useEffect, useCallback } from 'react';
import { FaUser, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaPlus, FaCheckCircle, FaTrash, FaSpinner } from 'react-icons/fa';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { apiFetch } from '../utils/api';

const Signup = () => {
  const { toasts, removeToast, success, error: showError } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Receptionist accounts list from API
  const [receptionists, setReceptionists] = useState([]);
  const [fetchingList, setFetchingList] = useState(true);

  // Fetch live receptionists directly from backend database API
  const fetchReceptionists = useCallback(async () => {
    setFetchingList(true);
    try {
      const res = await apiFetch('/users');
      if (res.ok) {
        const json = await res.json();
        const usersList = json.data || json || [];
        if (Array.isArray(usersList)) {
          const receptionOnly = usersList.filter((u) => u.role === 'receptionist' || u.role === 'reception');
          setReceptionists(receptionOnly);
        }
      }
    } catch (e) {
      console.error('Error fetching users from API:', e);
    } finally {
      setFetchingList(false);
    }
  }, []);

  useEffect(() => {
    fetchReceptionists();
  }, [fetchReceptionists]);

  // Create new Receptionist account directly in backend database API
  const handleCreateReceptionist = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showError('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      showError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role: 'receptionist'
    };

    try {
      let res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status === 404) {
        // Fallback to /auth/register if /users route is not yet deployed on server
        res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        success(`Receptionist account created for ${email.trim()} directly in database!`);
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        fetchReceptionists();
      } else {
        const json = await res.json();
        showError(json.message || 'Failed to create receptionist account.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error. Unable to create receptionist account.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Receptionist account directly from backend database API
  const handleDeleteReceptionist = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receptionist account from database?')) return;
    try {
      const res = await apiFetch(`/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Receptionist account deleted from database!');
        fetchReceptionists();
      } else {
        const json = await res.json();
        showError(json.message || 'Failed to delete account.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error deleting account.');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Receptionist Credentials Manager
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Create & manage receptionist login accounts directly in the database.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Form Card: Create Receptionist */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <FaPlus className="text-xs text-[#960c0c]" /> Add New Receptionist
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Enter details to generate reception desk login credentials.</p>
          </div>

          <form onSubmit={handleCreateReceptionist} autoComplete="off" className="space-y-4">

            {/* Staff Name */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider block">
                Staff Name / Desk Name
              </label>
              <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
                <FaUser className="text-slate-400 text-xs shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Front Desk Shift 1"
                  className="w-full pl-3 bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email / Username */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider block">
                Receptionist Email / Username
              </label>
              <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
                <FaEnvelope className="text-slate-400 text-xs shrink-0" />
                <input
                  type="email"
                  placeholder="e.g. reception@gmail.com"
                  className="w-full pl-3 bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider block">
                Password
              </label>
              <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
                <FaLock className="text-slate-400 text-xs shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-3 bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-700 transition ml-2 cursor-pointer"
                >
                  {showPassword ? <FaEyeSlash className="text-xs" /> : <FaEye className="text-xs" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
                <FaLock className="text-slate-400 text-xs shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-3 bg-transparent outline-none text-xs font-semibold text-slate-800 placeholder-slate-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Role Read-Only Field */}
            <div className="pt-1">
              <span className="text-[10px] font-extrabold text-slate-400 mb-1.5 uppercase tracking-wider block">Assigned Role</span>
              <div className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-extrabold text-indigo-700">Receptionist Desk</span>
                <span className="text-[9px] font-black uppercase bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-md">Locked</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin text-xs" /> Generating Account...
                </>
              ) : (
                '✓ Generate Receptionist Account'
              )}
            </button>

          </form>
        </div>

        {/* List Card: Active Receptionists */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/70 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                Active Receptionist Accounts
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Staff members authorized to log in via Reception Desk tab.</p>
            </div>
            <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-xl">
              {receptionists.length} Active Desk(s)
            </span>
          </div>

          {fetchingList ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <FaSpinner className="animate-spin text-sm text-indigo-600" /> Loading receptionist accounts from server...
            </div>
          ) : receptionists.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-200/60 p-6 space-y-2">
              <p className="text-slate-600 font-bold text-xs">No receptionist accounts found in the database.</p>
              <p className="text-slate-400 text-[11px]">Use the form on the left to create the first receptionist login credentials.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receptionists.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50/60 border border-slate-200/70 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                      R
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">{item.name || 'Reception Desk'}</h3>
                      <p className="text-[11px] text-slate-500 font-medium">{item.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <FaCheckCircle className="text-[9px]" /> Active
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteReceptionist(item.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition duration-150 cursor-pointer"
                      title="Delete Receptionist Account"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Signup;


