import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) return null; // or show a spinner/loading

  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
