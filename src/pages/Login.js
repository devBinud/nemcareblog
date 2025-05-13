// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'; // Importing icons
import backgroundImage from '../assets/img/bg.jpg';
import logo from '../assets/img/logo.png';
import { useAuth } from '../context/AuthContext'; // Importing the Auth context

const Login = () => {
  const { login, error } = useAuth(); // Using login function from context
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    await login(email, password);
    if (error) {
      console.log(error); // Handle error if any
    } else {
      navigate('/'); // Redirect after successful login
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

      {/* Login Card */}
      <div className="relative z-10 bg-white rounded-xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-16 object-contain" />
        </div>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
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

          {/* Login Button */}
          <button
            type="submit"
            className="w-full bg-[#960c0c] hover:bg-[#7d0a0a] text-white font-semibold py-3 rounded transition cursor-pointer"
          >
            Login
          </button>
        </form>

        {error && (
          <p className="text-red-600 mt-3 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Login;
