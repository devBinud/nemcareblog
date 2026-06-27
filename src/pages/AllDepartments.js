import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiLayers, FiSearch } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const AllDepartments = () => {
  const { toasts, removeToast } = useToast();

  // States
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Active Clinical Departments</h1>
        <p className="text-slate-400 text-xs mt-1">Review active clinical departments within the hospital booking system.</p>
      </div>

      {/* Active Departments Table Container */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiLayers className="text-[#960c0c]" /> Active Departments
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
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept, idx) => (
                  <tr key={dept.id} className="hover:bg-slate-50/40 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium">
                    <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold text-slate-550">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 pl-5 font-bold text-slate-800">
                      {dept.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllDepartments;
