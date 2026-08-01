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
import Appointments from './pages/Appointments';
import AddDepartment from './pages/AddDepartment';
import AllDepartments from './pages/AllDepartments';
import AddDoctor from './pages/AddDoctor';
import AllDoctors from './pages/AllDoctors';
import ManageSlots from './pages/ManageSlots';
import DoctorAvailability from './pages/DoctorAvailability';

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
        <Route index element={<Appointments />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        } />
        <Route path="/blogs/new" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddBlogs />
          </ProtectedRoute>
        } />
        <Route path="/blogs/:id" element={<BlogDetails />} />
        <Route path="/blogs/edit/:id" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EditBlogs />
          </ProtectedRoute>
        } />
        <Route path="/blogs" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AllBlogs />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={<Profile />} />
        <Route path="/signup" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Signup />
          </ProtectedRoute>
        } />
        <Route path="departments" element={<AllDepartments />} />
        <Route path="departments/new" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddDepartment />
          </ProtectedRoute>
        } />
        <Route path="doctors" element={<AllDoctors />} />
        <Route path="doctors/new" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddDoctor />
          </ProtectedRoute>
        } />
        <Route path="slots" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageSlots />
          </ProtectedRoute>
        } />
        <Route path="availability" element={<DoctorAvailability />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}


export default App;
