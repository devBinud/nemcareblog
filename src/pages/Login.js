import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import backgroundImage from '../assets/img/bg.jpg';
import logo from '../assets/img/logo.png';
import { useAuth } from '../context/AuthContext';
import { ToastContainer } from '../components/Toast';
import useToast from '../hooks/useToast';

const Login = () => {
  const { login, error: authError, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, error: showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  // Show auth errors as toast
  useEffect(() => {
    if (authError) showError(authError);
  }, [authError, showError]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#960c0c]/25 via-slate-900/40 to-slate-950/65 backdrop-blur-[3px]" />

      {/* Premium White Login Card */}
      <div className="relative z-10 bg-white rounded-3xl border border-slate-200/50 shadow-[0_20px_50px_rgba(15,23,42,0.08)] p-10 w-full max-w-[420px] mx-4 animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Nemcare Logo" className="h-16 object-contain" />
        </div>

        <h2 className="text-center text-slate-800 text-xl font-bold tracking-tight mb-1">
          Welcome Back
        </h2>
        <p className="text-center text-slate-400 text-xs mb-8">
          Admin Panel
        </p>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">

          {/* Email */}
          <div className="group">
            <label className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3.5 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
              <FaEnvelope className="text-slate-400 text-sm shrink-0" />
              <input
                type="email"
                placeholder="Enter Admin Email"
                className="w-full pl-3 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Password
              </label>
            </div>
            <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3.5 transition-all duration-300 focus-within:border-[#960c0c] focus-within:bg-white">
              <FaLock className="text-slate-400 text-sm shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-3 bg-transparent outline-none text-sm text-slate-800 placeholder-slate-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-700 transition ml-2 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-red-950/10 active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-400 mt-8">
          © {new Date().getFullYear()} Nemcare Hospital. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
