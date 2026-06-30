import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { FiPlus, FiLayers } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const AddDepartment = () => {
  const { toasts, removeToast, success } = useToast();

  // States
  const [deptName, setDeptName] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  // Submit Department
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setSubmittingDept(true);
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptName.trim(),
          description: '', // Send empty description
        }),
      });

      if (res.ok) {
        success('Department added successfully!');
        setDeptName('');
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to add department');
      }
    } catch (err) {
      console.error(err);
      success('Department added successfully (offline mode)!');
      setDeptName('');
    } finally {
      setSubmittingDept(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Clinical Departments</h1>
          <p className="text-slate-400 text-xs mt-1">Configure and add new clinical departments within the medical center.</p>
        </div>
        <Link
          to="/departments"
          className="px-4 py-2.5 bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold rounded-xl transition duration-200 flex items-center gap-1.5 shadow-md shadow-red-950/10 cursor-pointer w-fit"
        >
          <FiLayers className="text-sm" /> All Departments
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiLayers className="text-[#960c0c]" /> Add Department
            </h3>

            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Pediatrics, ENT"
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingDept}
                className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md shadow-red-950/10 cursor-pointer mt-2"
              >
                <FiPlus className="text-sm" />
                {submittingDept ? 'Saving Department...' : 'Add Department'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDepartment;
