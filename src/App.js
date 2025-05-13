import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AddBlogs from './pages/AddBlogs';
import AllBlogs from './pages/AllBlogs';
import BlogDetails from './pages/BlogDetails';
import EditBlogs from './pages/EditBlogs';
import Profile from './pages/Profile';
import Signup from './pages/Signup';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="/blogs/new" element={<AddBlogs />} />
        <Route path="/blogs/:id" element={<BlogDetails />} />
        <Route path="/blogs/edit/:id" element={<EditBlogs />} />
        <Route path="/blogs" element={<AllBlogs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
