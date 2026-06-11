import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiUser, FiLayers } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
// Mock data fallbacks for showcase moved to module scope
const mockDepts = [
  { id: 1, name: 'Cardiology', description: 'Heart and cardiovascular system care' },
  { id: 2, name: 'Pediatrics', description: 'Medical care for infants, children, and adolescents' },
  { id: 3, name: 'Neurology', description: 'Disorders of the nervous system' }
];

const mockDocs = [
  { id: 1, name: 'Dr. Sarah Connor', designation: 'Senior Cardiologist', department_id: 1, department: { name: 'Cardiology' } },
  { id: 2, name: 'Dr. Alan Vance', designation: 'Pediatric Consultant', department_id: 2, department: { name: 'Pediatrics' } },
  { id: 3, name: 'Dr. Robert Carter', designation: 'Chief Neurologist', department_id: 3, department: { name: 'Neurology' } }
];

const ManageDoctors = () => {
  const { toasts, removeToast, success, error } = useToast();

  // States
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Form States - Department
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [submittingDept, setSubmittingDept] = useState(false);

  // Form States - Doctor
  const [docName, setDocName] = useState('');
  const [docDesignation, setDocDesignation] = useState('');
  const [docDeptId, setDocDeptId] = useState('');
  const [submittingDoc, setSubmittingDoc] = useState(false);

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
      console.warn('API connection failed. Using mock departments.', err);
      setDepartments(mockDepts);
    } finally {
      setLoadingDepts(false);
    }
  }, []);

  // Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('/doctors');
      if (res.ok) {
        const json = await res.json();
        setDoctors(json.data || json);
      } else {
        throw new Error('Failed to fetch doctors');
      }
    } catch (err) {
      console.warn('API connection failed. Using mock doctors.', err);
      // Construct doctor data using loaded departments if possible
      setDoctors(mockDocs);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, [fetchDepartments, fetchDoctors]);

  // Submit Department
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    setSubmittingDept(true);
    try {
      const res = await apiFetch('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: deptName,
          description: deptDesc,
        }),
      });

      if (res.ok) {
        success('Department added successfully!');
        setDeptName('');
        setDeptDesc('');
        fetchDepartments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to add department');
      }
    } catch (err) {
      console.error(err);
      // Fallback behavior for offline/showcase: update local state
      const newId = departments.length ? Math.max(...departments.map(d => d.id)) + 1 : 1;
      const newDept = { id: newId, name: deptName, description: deptDesc || 'N/A' };
      setDepartments([...departments, newDept]);
      success('Department added successfully (offline mode)!');
      setDeptName('');
      setDeptDesc('');
    } finally {
      setSubmittingDept(false);
    }
  };

  // Submit Doctor
  const handleAddDoc = async (e) => {
    e.preventDefault();
    if (!docName.trim() || !docDesignation.trim() || !docDeptId) {
      error('Please fill in all doctor details.');
      return;
    }

    setSubmittingDoc(true);
    try {
      const res = await apiFetch('/doctors', {
        method: 'POST',
        body: JSON.stringify({
          name: docName,
          designation: docDesignation,
          department_id: Number(docDeptId),
        }),
      });

      if (res.ok) {
        success('Doctor added successfully!');
        setDocName('');
        setDocDesignation('');
        setDocDeptId('');
        fetchDoctors();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to add doctor');
      }
    } catch (err) {
      console.error(err);
      // Fallback behavior for offline/showcase: update local state
      const selectedDept = departments.find(d => d.id === Number(docDeptId));
      const newId = doctors.length ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
      const newDoc = {
        id: newId,
        name: docName,
        designation: docDesignation,
        department_id: Number(docDeptId),
        department: { name: selectedDept ? selectedDept.name : 'Unknown' }
      };
      setDoctors([...doctors, newDoc]);
      success('Doctor added successfully (offline mode)!');
      setDocName('');
      setDocDesignation('');
      setDocDeptId('');
    } finally {
      setSubmittingDoc(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Doctors & Departments</h1>
        <p className="text-slate-400 text-xs mt-1">Configure and manage clinical departments and their medical officers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Departments */}
        <div className="space-y-6">
          {/* Add Department Card */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiLayers className="text-[#960c0c]" /> Add Department
            </h3>

            <form onSubmit={handleAddDept} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology, Pediatrics"
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Description (Optional)</label>
                <textarea
                  placeholder="Clinical functions and speciality overview..."
                  rows="2"
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 resize-none"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submittingDept}
                className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md shadow-red-950/10 cursor-pointer"
              >
                <FiPlus className="text-sm" />
                {submittingDept ? 'Saving Department...' : 'Add Department'}
              </button>
            </form>
          </div>

          {/* Department List Card */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4">Active Departments</h3>

            {loadingDepts ? (
              <p className="text-xs text-slate-400 animate-pulse py-4">Loading departments...</p>
            ) : departments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No departments found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 pb-2">ID</th>
                      <th className="py-2.5 pb-2">Department Name</th>
                      <th className="py-2.5 pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => (
                      <tr key={dept.id} className="border-b border-slate-100/50 text-slate-600 font-medium hover:bg-slate-50/50">
                        <td className="py-3 pr-2 text-slate-450 font-mono text-[10px]">{String(dept.id).padStart(3, '0')}</td>
                        <td className="py-3 font-bold text-slate-800 pr-4">{dept.name}</td>
                        <td className="py-3 text-slate-400 max-w-[200px] truncate">{dept.description || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Doctors */}
        <div className="space-y-6">
          {/* Add Doctor Card */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiUser className="text-[#960c0c]" /> Add Doctor
            </h3>

            <form onSubmit={handleAddDoc} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Doctor Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-xs">Dr.</span>
                  <input
                    type="text"
                    placeholder="Sarah Connor, Robert Carter"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Cardiologist"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={docDesignation}
                    onChange={(e) => setDocDesignation(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Clinical Department</label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={docDeptId}
                    onChange={(e) => setDocDeptId(e.target.value)}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingDoc}
                className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md shadow-red-950/10 cursor-pointer"
              >
                <FiPlus className="text-sm" />
                {submittingDoc ? 'Registering Doctor...' : 'Register Doctor'}
              </button>
            </form>
          </div>

          {/* Doctors List Card */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4">Registered Doctors</h3>

            {loadingDocs ? (
              <p className="text-xs text-slate-400 animate-pulse py-4">Loading doctors...</p>
            ) : doctors.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No doctors registered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 pb-2">Name</th>
                      <th className="py-2.5 pb-2">Designation</th>
                      <th className="py-2.5 pb-2">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => {
                      // Lookup department name if not already included in joined payload
                      const deptName = doc.department?.name ||
                        departments.find(d => d.id === doc.department_id)?.name ||
                        'Clinical Specialist';

                      return (
                        <tr key={doc.id} className="border-b border-slate-100/50 text-slate-600 font-medium hover:bg-slate-50/50">
                          <td className="py-3 font-bold text-slate-800 pr-4">Dr. {doc.name.replace(/^Dr\.\s+/i, '')}</td>
                          <td className="py-3 text-slate-500 pr-4">{doc.designation}</td>
                          <td className="py-3">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#960c0c]/5 text-[#960c0c] border border-[#960c0c]/10">
                              {deptName}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ManageDoctors;
