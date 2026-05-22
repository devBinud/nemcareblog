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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Nemcare Logo" className="h-16 object-contain" />
        </div>

        <h2 className="text-center text-gray-700 text-sm font-medium mb-6 tracking-wide uppercase">
          Admin Panel Login
        </h2>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">

          {/* Email */}
          <div className="group">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Email
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 transition-all duration-200 focus-within:border-[#960c0c] focus-within:ring-2 focus-within:ring-[#960c0c]/20 focus-within:bg-white">
              <FaEnvelope className="text-gray-400 text-sm shrink-0" />
              <input
                type="email"
                placeholder="admin@nemcare.com"
                className="w-full pl-3 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Password
            </label>
            <div className="flex items-center border border-gray-200 rounded-lg px-4 py-3 bg-gray-50 transition-all duration-200 focus-within:border-[#960c0c] focus-within:ring-2 focus-within:ring-[#960c0c]/20 focus-within:bg-white">
              <FaLock className="text-gray-400 text-sm shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-3 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition ml-2"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#960c0c] hover:bg-[#7d0a0a] disabled:bg-[#960c0c]/60 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Nemcare Hospital. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
