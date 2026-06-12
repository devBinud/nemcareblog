import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiPlus, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';
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



// Helper to sort slots chronologically

// Helper to sort slots chronologically moved to module level
const sortSlots = (slotsList) => {
  return [...slotsList].sort((a, b) => {
    const timeA = a.start_time.split(':').map(Number);
    const timeB = b.start_time.split(':').map(Number);
    if (timeA[0] !== timeB[0]) return timeA[0] - timeB[0];
    return timeA[1] - timeB[1];
  });
};

const ManageSlots = () => {
  const { toasts, removeToast, success, error } = useToast();

  // States
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setStartTime(slot.start_time);
    setEndTime(slot.end_time);
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingSlot(null);
    setIsEditModalOpen(false);
    setStartTime('');
    setEndTime('');
  };


  // Fetch Slots
  const fetchSlots = useCallback(async () => {
    try {
      const res = await apiFetch('/slots');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setSlots(sortSlots(data));
      } else {
        error('Failed to fetch master slots');
      }
    } catch (err) {
      console.error('API connection failed.', err);
      error('Network error. Could not load slots from server.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);



  const handleUpdateSlotSubmit = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      error('Please select both start and end times.');
      return;
    }

    // Validate that end time is after start time
    const startNum = startTime.split(':').map(Number);
    const endNum = endTime.split(':').map(Number);
    const startMinutes = startNum[0] * 60 + startNum[1];
    const endMinutes = endNum[0] * 60 + endNum[1];

    if (endMinutes <= startMinutes) {
      error('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/slots/${editingSlot.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
        }),
      });

      if (res.ok) {
        success('Master slot updated successfully!');
        handleCancelEdit();
        fetchSlots();
      } else {
        const json = await res.json();
        error(json.message || 'Failed to update slot');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to update slot.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add Slot
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      error('Please select both start and end times.');
      return;
    }

    // Validate that end time is after start time
    const startNum = startTime.split(':').map(Number);
    const endNum = endTime.split(':').map(Number);
    const startMinutes = startNum[0] * 60 + startNum[1];
    const endMinutes = endNum[0] * 60 + endNum[1];

    if (endMinutes <= startMinutes) {
      error('End time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/slots', {
        method: 'POST',
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
        }),
      });

      if (res.ok) {
        success('Master slot configured successfully!');
        setStartTime('');
        setEndTime('');
        fetchSlots();
      } else {
        const json = await res.json();
        error(json.message || 'Failed to create slot');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to configure slot.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this master slot? This might affect active doctor schedules.")) return;

    try {
      const res = await apiFetch(`/slots/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        success('Master slot deleted successfully!');
        fetchSlots();
      } else {
        const json = await res.json();
        error(json.message || 'Failed to delete slot');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to delete slot.');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Time Slots Configuration</h1>
        <p className="text-slate-400 text-xs mt-1">Establish the standard booking intervals (e.g. 15-minute operational slots).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Form (1/3 Width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <FiClock className="text-[#960c0c]" /> Add Master Slot
            </h3>

            <form onSubmit={handleAddSlot} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Start Time (24h)</label>
                <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                  <FiClock className="text-slate-400 text-xs shrink-0" />
                  <input
                    type="time"
                    className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">End Time (24h)</label>
                <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                  <FiClock className="text-slate-400 text-xs shrink-0" />
                  <input
                    type="time"
                    className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md shadow-red-950/10 cursor-pointer mt-2"
              >
                <FiPlus className="text-sm" />
                {submitting ? 'Creating Slot...' : 'Create Master Slot'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Existing Slots (2/3 Width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-2">Configured Operational Slots</h3>
            <p className="text-slate-400 text-xs mb-6">These intervals form the clinical scheduler's default daily templates.</p>

            {loading ? (
              <p className="text-xs text-slate-400 animate-pulse py-4">Loading slots...</p>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">No master time slots configured yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {slots.map((slot) => {
                  return (
                    <div
                      key={slot.id}
                      className="relative overflow-hidden flex items-center justify-between p-4 bg-white border border-slate-150 rounded-2xl shadow-3xs hover:shadow-xs hover:border-[#960c0c]/30 hover:scale-[1.01] transition-all duration-300 group"
                    >
                      {/* Left vertical brand accent */}
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-200 group-hover:bg-[#960c0c] transition-colors duration-300" />

                      <div className="flex items-center gap-3.5 pl-1.5">
                        <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-[#960c0c]/5 group-hover:text-[#960c0c] transition-colors duration-300 flex items-center justify-center shrink-0">
                          <FiClock className="text-sm" />
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-800">
                            {formatSlotRange(slot.start_time, slot.end_time)}
                          </h4>
                          <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                            Slot #{slot.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditSlot(slot)}
                          className="text-slate-400 hover:text-[#960c0c] hover:bg-red-50 p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
                          title="Edit Slot"
                        >
                          <FiEdit2 className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all duration-200 cursor-pointer shrink-0"
                          title="Delete Slot"
                        >
                          <FiTrash2 className="text-xs" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit Slot Modal Overlay */}
      {isEditModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiClock className="text-[#960c0c]" /> Edit Master Slot #{editingSlot.id}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-slate-450 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateSlotSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Start Time (24h)</label>
                <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                  <FiClock className="text-slate-400 text-xs shrink-0" />
                  <input
                    type="time"
                    className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">End Time (24h)</label>
                <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                  <FiClock className="text-slate-400 text-xs shrink-0" />
                  <input
                    type="time"
                    className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSlots;
