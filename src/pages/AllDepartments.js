import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { FiLayers, FiSearch, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const AllDepartments = () => {
  const { toasts, removeToast, success, error: showError } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // States
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Inline Editing States
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [savingId, setSavingId] = useState(null);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiFetch('/departments');
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data || json);
      } else {
        throw new Error('Failed to fetch departments');
      }
    } catch (err) {
      console.warn('API connection failed.', err);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Start Inline Edit
  const handleStartEdit = (dept) => {
    setEditingId(dept.id);
    setEditingName(dept.name);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save Edit via API (PUT /api/departments/:id)
  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) {
      showError('Department name cannot be empty.');
      return;
    }

    setSavingId(id);
    try {
      const res = await apiFetch(`/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (res.ok) {
        success('Department updated successfully!');
        setEditingId(null);
        fetchDepartments();
      } else {
        const json = await res.json();
        showError(json.message || 'Failed to update department.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error updating department.');
    } finally {
      setSavingId(null);
    }
  };

  // Delete Department via API (DELETE /api/departments/:id)
  const handleDeleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete department "${name}"?`)) return;

    try {
      const res = await apiFetch(`/departments/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        success(`Department "${name}" deleted successfully!`);
        fetchDepartments();
      } else {
        const json = await res.json();
        showError(json.message || 'Failed to delete department.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error deleting department.');
    }
  };

  // Filtered departments based on search term
  const filteredDepartments = useMemo(() => {
    if (!searchTerm.trim()) return departments;
    const term = searchTerm.toLowerCase();
    return departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(term) ||
        (dept.description && dept.description.toLowerCase().includes(term))
    );
  }, [departments, searchTerm]);

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Active Clinical Departments</h1>
          <p className="text-slate-400 text-xs mt-1">Review active clinical departments within the hospital booking system.</p>
        </div>
        {isAdmin && (
          <Link
            to="/departments/new"
            className="px-4 py-2.5 bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold rounded-xl transition duration-200 flex items-center gap-1.5 shadow-md shadow-red-950/10 cursor-pointer w-fit"
          >
            <FiLayers className="text-sm" /> Add Department
          </Link>
        )}
      </div>

      {/* Active Departments Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Active Departments
          </h3>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
            />
          </div>
        </div>

        {loadingDepts ? (
          <p className="text-xs text-slate-400 animate-pulse py-4">Loading departments...</p>
        ) : filteredDepartments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No departments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4 text-center w-14 border-r border-slate-200">SL No.</th>
                  <th className="py-3 px-4 pl-5">Department Name</th>
                  {isAdmin && <th className="py-3 px-4 text-center w-28 border-l border-slate-200">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept, idx) => {
                  const isEditing = editingId === dept.id;
                  const isSaving = savingId === dept.id;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/40 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium">
                      <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold text-slate-550">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 pl-5 font-bold text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(dept.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            className="w-full border border-indigo-300 bg-indigo-50/40 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          dept.name
                        )}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 border-l border-slate-200 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(dept.id)}
                                disabled={isSaving}
                                className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                title="Save Changes"
                              >
                                <FiCheck className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Cancel Edit"
                              >
                                <FiX className="text-sm" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(dept)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Edit Department"
                              >
                                <FiEdit2 className="text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Delete Department"
                              >
                                <FiTrash2 className="text-xs" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDepartments;

