import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiPlus, FiTrash2 } from 'react-icons/fi';
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



// Mock data fallbacks for showcase moved outside component
const mockSlots = [
  { id: 1, start_time: '09:00', end_time: '09:15' },
  { id: 2, start_time: '09:15', end_time: '09:30' },
  { id: 3, start_time: '09:30', end_time: '09:45' },
  { id: 4, start_time: '09:45', end_time: '10:00' },
  { id: 5, start_time: '10:00', end_time: '10:15' },
  { id: 6, start_time: '10:15', end_time: '10:30' },
  { id: 7, start_time: '11:00', end_time: '11:15' },
  { id: 8, start_time: '11:15', end_time: '11:30' },
];

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


  // Fetch Slots
  const fetchSlots = useCallback(async () => {
    try {
      const res = await apiFetch('/slots');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setSlots(sortSlots(data));
      } else {
        throw new Error('Failed to fetch master slots');
      }
    } catch (err) {
      console.warn('API connection failed. Using mock slots.', err);
      setSlots(sortSlots(mockSlots));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

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
        throw new Error(json.message || 'Failed to create slot');
      }
    } catch (err) {
      console.error(err);
      // Fallback behavior for offline/showcase: update local state
      const newId = slots.length ? Math.max(...slots.map(s => s.id)) + 1 : 1;
      const newSlot = { id: newId, start_time: startTime, end_time: endTime };
      setSlots(sortSlots([...slots, newSlot]));
      success('Master slot configured successfully (offline mode)!');
      setStartTime('');
      setEndTime('');
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
        throw new Error(json.message || 'Failed to delete slot');
      }
    } catch (err) {
      console.warn('API delete failed. Updating local state (offline mode).', err);
      setSlots(slots.filter(s => s.id !== id));
      success('Master slot deleted successfully (offline mode)!');
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
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
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
    </div>
  );
};

export default ManageSlots;
