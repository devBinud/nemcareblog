import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Profile = () => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    // Password change would require a backend endpoint — placeholder for now
    setSuccess('Password update requires a backend API endpoint. Please configure it on your server.');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="w-full min-h-screen p-6 bg-gray-50">
      <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Settings</h2>

      {/* User Info */}
      <div className="bg-white shadow-md rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">User Information</h3>
        <div className="space-y-1 text-gray-800">
          <p className="text-sm"><span className="font-medium">Name:</span> Admin User</p>
          <p className="text-sm"><span className="font-medium">Email:</span> ncbadmin@gmail.com</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="grid gap-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 capitalize">
                {field.replace(/([A-Z])/g, ' $1')}
              </label>
              <div className="relative">
                <input
                  type={passwordVisibility[field] ? 'text' : 'password'}
                  name={field}
                  value={passwordData[field]}
                  onChange={handleChange}
                  className="mt-1 w-full px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                  onClick={() => togglePasswordVisibility(field)}
                >
                  {passwordVisibility[field] ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="bg-[#960c0c] hover:bg-[#b91c1c] text-white font-semibold px-5 py-2 rounded-lg transition-colors duration-300"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
