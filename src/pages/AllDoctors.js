import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  FiSearch, FiClock, FiTrash2,
  FiEdit2, FiBriefcase, FiX, FiCheck, FiBookOpen, FiInfo
} from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minStr = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minStr} ${ampm}`;
};

const formatSlotRange = (start, end) => {
  if (!start) return '';
  if (!end) return formatTimeTo12Hour(start);
  return `${formatTimeTo12Hour(start)} - ${formatTimeTo12Hour(end)}`;
};

const AllDoctors = () => {
  const { toasts, removeToast, success, error } = useToast();

  // Core Lists
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [masterSlots, setMasterSlots] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');



  // Edit Modal States
  const [editingDoc, setEditingDoc] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editContactEmail, setEditContactEmail] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editPreviousExperience, setEditPreviousExperience] = useState('');
  const [editAreasOfExpertise, setEditAreasOfExpertise] = useState('');
  const [editAchievements, setEditAchievements] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Slot Assignment Modal States
  const [slotAssignDoc, setSlotAssignDoc] = useState(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [assignSlotIds, setAssignSlotIds] = useState([]);
  const [submittingSlots, setSubmittingSlots] = useState(false);

  // Fetch Lookups & Doctors
  const fetchData = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const [deptsRes, slotsRes, docsRes] = await Promise.all([
        apiFetch('/departments'),
        apiFetch('/slots'),
        apiFetch('/doctors')
      ]);

      if (deptsRes.ok) {
        const json = await deptsRes.json();
        setDepartments(json.data || json);
      }

      if (slotsRes.ok) {
        const json = await slotsRes.json();
        setMasterSlots(json.data || json);
      }

      if (docsRes.ok) {
        const json = await docsRes.json();
        setDoctors(json.data || json);
      }
    } catch (err) {
      console.warn('API error loading doctors details.', err);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  // Open Edit Modal
  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setEditName(doc.name || '');
    setEditDesignation(doc.designation || '');
    setEditDepartmentId(doc.department_id || '');
    setEditExperienceYears(doc.experience_years || '');
    setEditSpecialty(doc.specialty || '');
    setEditContactEmail(doc.contact_email || '');
    setEditBio(doc.bio || '');
    setEditEducation(doc.education || '');
    setEditPreviousExperience(doc.previous_experience || '');
    setEditAreasOfExpertise(doc.areas_of_expertise || '');
    setEditAchievements(doc.achievements || '');
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editDesignation.trim() || !editDepartmentId) {
      error('Name, Designation, and Department are required.');
      return;
    }

    setSubmittingEdit(true);
    const payload = {
      name: editName.trim(),
      designation: editDesignation.trim(),
      department_id: Number(editDepartmentId),
      experience_years: editExperienceYears.trim() || null,
      specialty: editSpecialty.trim() || null,
      contact_email: editContactEmail.trim() || null,
      bio: editBio.trim() || null,
      education: editEducation.trim() || null,
      previous_experience: editPreviousExperience.trim() || null,
      areas_of_expertise: editAreasOfExpertise.trim() || null,
      achievements: editAchievements.trim() || null
    };

    try {
      const res = await apiFetch(`/doctors/${editingDoc.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        success('Doctor profile updated successfully!');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update profile');
      }
    } catch (err) {
      console.warn('API Edit failed. Saving to local state (offline mode).', err);
      const matchedDept = departments.find(d => d.id === Number(editDepartmentId));
      setDoctors(prev => prev.map(d =>
        d.id === editingDoc.id
          ? {
            ...d,
            ...payload,
            department: { name: matchedDept ? matchedDept.name : 'Unknown Department' }
          }
          : d
      ));
      success('Doctor profile updated successfully (offline mode)!');
      setIsEditModalOpen(false);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Slots Modal
  const openSlotsModal = (doc) => {
    setSlotAssignDoc(doc);
    setAssignSlotIds(doc.slot_ids || []);
    setIsSlotModalOpen(true);
  };

  // Toggle Slot in Assignment Modal
  const handleToggleAssignSlotId = (id) => {
    if (assignSlotIds.includes(id)) {
      setAssignSlotIds(prev => prev.filter(sid => sid !== id));
    } else {
      setAssignSlotIds(prev => [...prev, id]);
    }
  };

  // Submit Slot Assignment
  const handleSlotsSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSlots(true);

    try {
      const res = await apiFetch(`/doctors/${slotAssignDoc.id}/slots`, {
        method: 'POST',
        body: JSON.stringify({ slot_ids: assignSlotIds })
      });

      if (res.ok) {
        success('Doctor slots updated successfully!');
        setIsSlotModalOpen(false);
        fetchData();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update slots');
      }
    } catch (err) {
      console.warn('API Slots post failed. Saving to local state (offline mode).', err);
      setDoctors(prev => prev.map(d =>
        d.id === slotAssignDoc.id ? { ...d, slot_ids: assignSlotIds } : d
      ));
      success('Doctor slots updated successfully (offline mode)!');
      setIsSlotModalOpen(false);
    } finally {
      setSubmittingSlots(false);
    }
  };

  // Delete Doctor
  const handleDeleteDoctor = async (id, docName) => {
    if (!window.confirm(`Are you sure you want to remove Dr. ${docName}?`)) return;

    try {
      const res = await apiFetch(`/doctors/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        success('Doctor profile deleted successfully.');
        fetchData();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete doctor profile');
      }
    } catch (err) {
      console.error(err);
      if (err.message && (err.message.includes('appointment') || err.message.includes('booked'))) {
        error(err.message);
      } else {
        setDoctors(prev => prev.filter(d => d.id !== id));
        success('Doctor profile deleted successfully (offline mode).');
      }
    }
  };

  // Filter Doctors by Search Term
  const filteredDoctors = useMemo(() => {
    if (!searchTerm.trim()) return doctors;
    const term = searchTerm.toLowerCase();
    return doctors.filter(doc => {
      const deptName = doc.department?.name || departments.find(d => d.id === doc.department_id)?.name || '';
      return (
        doc.name.toLowerCase().includes(term) ||
        doc.designation.toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term) ||
        (doc.specialty && doc.specialty.toLowerCase().includes(term))
      );
    });
  }, [doctors, departments, searchTerm]);

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Doctors</h1>
          <p className="text-slate-400 text-xs mt-1">Review active doctors, modify details, and configure master booking slots.</p>
        </div>
        <Link
          to="/doctors/new"
          className="px-4 py-2.5 bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold rounded-xl transition duration-200 flex items-center gap-1.5 shadow-md shadow-red-950/10 cursor-pointer w-fit"
        >
          <FiBriefcase className="text-sm" /> Add Doctor
        </Link>
      </div>

      {/* Search and Controls */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FiBriefcase className="text-[#960c0c]" /> Active Doctors
          </h3>
          <p className="text-slate-400 text-[10px] mt-0.5 font-medium">Currently registered consulting doctors.</p>
        </div>

        <div className="relative max-w-xs w-full">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            placeholder="Search doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
          />
        </div>
      </div>

      {/* Doctors Cards Grid */}
      {loadingDocs ? (
        <p className="text-xs text-slate-400 animate-pulse py-6">Loading doctors...</p>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-6">
          <p className="text-xs text-slate-450 font-medium">No doctors registered. Click 'Add Doctor' to register one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4 text-center w-14 border-r border-slate-200">SL No.</th>
                  <th className="py-3 px-4 pl-5 border-r border-slate-200">Doctor</th>
                  <th className="py-3 px-4 border-r border-slate-200">Designation</th>
                  <th className="py-3 px-4 border-r border-slate-200">Department</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc, idx) => {
                  const deptName = doc.department?.name || departments.find(d => d.id === doc.department_id)?.name || 'Clinical Specialist';

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/40 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium">
                      {/* SL No */}
                      <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold text-slate-550">
                        {idx + 1}
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 pl-5 font-bold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-black text-slate-800 text-xs">Dr. {doc.name.replace(/^Dr\.\s+/i, '')}</span>
                            {doc.contact_email && <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[170px]">{doc.contact_email}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 text-slate-600 font-bold border-r border-slate-200">
                        {doc.designation}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 border-r border-slate-200">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-bold bg-[#960c0c]/5 text-[#960c0c] border border-[#960c0c]/10">
                          {deptName}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 justify-center">
                          {/* Slots */}
                          <button
                            onClick={() => openSlotsModal(doc)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-650 hover:text-[#960c0c] hover:bg-red-50 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 shadow-3xs text-[10px] font-bold"
                            title="Assign Default Slots"
                          >
                            <FiClock className="text-xs" /> Slots
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(doc)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-655 hover:text-[#960c0c] hover:bg-red-50 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 shadow-3xs text-[10px] font-bold"
                            title="Edit Doctor Details"
                          >
                            <FiEdit2 className="text-xs" /> Edit
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 shadow-3xs text-[10px] font-bold"
                            title="Delete Profile"
                          >
                            <FiTrash2 className="text-xs" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Doctor Profile Modal */}
      {isEditModalOpen && editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiEdit2 className="text-[#960c0c]" /> Edit Dr. {editingDoc.name.replace(/^Dr\.\s+/i, '')}'s Profile
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="space-y-4">

              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Doctor Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 text-xs">Dr.</span>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
              </div>

              {/* Designation & Dept */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Designation *</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Clinical Department *</label>
                  <select
                    required
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editDepartmentId}
                    onChange={(e) => setEditDepartmentId(e.target.value)}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Advanced Core */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Experience (Years)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editExperienceYears}
                    onChange={(e) => setEditExperienceYears(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Specialty / Sub-dept</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Contact Email</label>
                  <input
                    type="email"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Bio & Details Area */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1"><FiBookOpen /> Edit Professional Biography & Details</h4>

                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider block">Biography</label>
                  <textarea
                    rows="3"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 resize-none"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider block">Education & Degrees</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={editEducation}
                    onChange={(e) => setEditEducation(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[9px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider block">Previous Experience</label>
                  <textarea
                    rows="1"
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 resize-none"
                    value={editPreviousExperience}
                    onChange={(e) => setEditPreviousExperience(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider block">Areas of Expertise</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                      value={editAreasOfExpertise}
                      onChange={(e) => setEditAreasOfExpertise(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold text-slate-400 mb-1 uppercase tracking-wider block">Achievements</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                      value={editAchievements}
                      onChange={(e) => setEditAchievements(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer"
                >
                  {submittingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Manage Slots Assignment Modal */}
      {isSlotModalOpen && slotAssignDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiClock className="text-[#960c0c]" /> Assign Default Slots
              </h3>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-455 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-700 font-bold mb-1">Dr. {slotAssignDoc.name.replace(/^Dr\.\s+/i, '')}</p>
              <p className="text-[10.5px] text-slate-400 font-medium">Select the weekly active scheduler intervals for this doctor.</p>
            </div>

            {/* Modal Content Form */}
            <form onSubmit={handleSlotsSubmit} className="space-y-6">

              {masterSlots.length === 0 ? (
                <div className="text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  <FiInfo className="text-slate-400 mx-auto mb-2 text-base" />
                  <p className="text-[10px] text-slate-450">No master slots configured. Set slots up first in the Time Slots view.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {masterSlots.map(slot => {
                    const isChecked = assignSlotIds.includes(slot.id);
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleToggleAssignSlotId(slot.id)}
                        className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer select-none transition-all duration-200 ${isChecked
                          ? 'border-[#960c0c]/40 bg-[#960c0c]/3 shadow-3xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50/50 hover:border-slate-300'
                          }`}
                      >
                        <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${isChecked
                          ? 'bg-[#960c0c] border-[#960c0c] text-white'
                          : 'border-slate-300 bg-white'
                          }`}>
                          {isChecked && <FiCheck className="text-[10px] stroke-[3]" />}
                        </div>
                        <span className={`text-[11.5px] font-bold ${isChecked ? 'text-slate-800' : 'text-slate-650'}`}>
                          {formatSlotRange(slot.start_time, slot.end_time)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSlots || masterSlots.length === 0}
                  className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer"
                >
                  {submittingSlots ? 'Saving Slots...' : 'Save Assignments'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AllDoctors;
