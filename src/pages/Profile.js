import React, { useState } from 'react';
import { auth } from '../firebase/Firebase';  // Ensure you're importing auth from Firebase
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth'; // Import Firebase methods
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons

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

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    try {
      // Reauthenticate the user with current password
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);

      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordData.newPassword);

      setSuccess('Password updated successfully');
      setError('');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      console.error(err);
      setError('Failed to update password. Please try again.');
      setSuccess('');
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  return (
    <div className="w-full min-h-screen p-6 bg-gray-50">
      <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Settings</h2>

      {/* User Info */}
      <div className="bg-white shadow-md rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">User Information</h3>
        <div className="space-y-1 text-gray-800">
          <p className='text-sm'><span className="font-small">Name:</span> Admin User</p>
          <p className='text-sm'><span className="font-small">Email:</span> ncbadmin@gmail.com</p>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white shadow-md rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="grid gap-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <div className="relative">
              <input
                type={passwordVisibility.currentPassword ? 'text' : 'password'}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                onClick={() => togglePasswordVisibility('currentPassword')}
              >
                {passwordVisibility.currentPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={passwordVisibility.newPassword ? 'text' : 'password'}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                onClick={() => togglePasswordVisibility('newPassword')}
              >
                {passwordVisibility.newPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <div className="relative">
              <input
                type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#960c0c] bg-gray-100"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600"
                onClick={() => togglePasswordVisibility('confirmPassword')}
              >
                {passwordVisibility.confirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

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
