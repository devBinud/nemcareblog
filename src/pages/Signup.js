// src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'; // Importing icons
import backgroundImage from '../assets/img/bg.jpg';
import logo from '../assets/img/logo.png';
import { useAuth } from '../context/AuthContext'; // Importing the Auth context

const Signup = () => {
  const { signup, error } = useAuth(); // Using signup function from context
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    await signup(email, password);
    if (!error) {
      navigate('/'); // Redirect after successful signup
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Background Image with Gradient Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="absolute inset-0"></div>

      {/* Signup Card */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-16 object-contain" />
        </div>

        <form onSubmit={handleSignup} autoComplete="off" className="space-y-4">
          {/* Email Field with Icon */}
          <div className="flex items-center border border-gray-300 rounded px-4 py-2 focus-within:border-[#960c0c] focus-within:ring-2 focus-within:ring-[#960c0c]">
            <FaUser className="text-gray-500" />
            <input
              type="email"
              placeholder="Email"
              className="w-full pl-2 outline-none font-semibold text-gray-700 focus:text-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          {/* Password Field with Icon & Show/Hide Toggle */}
          <div className="flex items-center border border-gray-300 rounded px-4 py-2 focus-within:border-[#960c0c] focus-within:ring-2 focus-within:ring-[#960c0c]">
            <FaLock className="text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="w-full pl-2 outline-none font-semibold text-gray-700 focus:text-gray-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="off"
            />
            <button
              type="button"
              className="text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            className="w-full bg-[#960c0c] hover:bg-[#7d0a0a] text-white font-semibold py-3 rounded transition cursor-pointer"
          >
            Sign Up
          </button>
        </form>

        {error && (
          <p className="text-red-600 mt-3 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Signup;
