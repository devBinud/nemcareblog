import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiUser, FiClock, FiLayers, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

const getTodayDateString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

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

// Mock fallback definitions moved outside component
const mockDepts = [
  { id: 1, name: 'Cardiology' },
  { id: 2, name: 'Pediatrics' },
  { id: 3, name: 'Neurology' }
];

const mockDocs = [
  { id: 1, name: 'Dr. Apurba Kumar Sarma', designation: 'Senior Cardiologist', department_id: 1 },
  { id: 2, name: 'Dr. Sarah Connor', designation: 'Senior Cardiologist', department_id: 1 },
  { id: 3, name: 'Dr. Alan Vance', designation: 'Pediatric Consultant', department_id: 2 },
  { id: 4, name: 'Dr. Robert Carter', designation: 'Chief Neurologist', department_id: 3 }
];

const defaultMockSlots = [
  { id: 1, start_time: '09:00', end_time: '09:15', is_booked: false, is_manually_disabled: false, available: true },
  { id: 2, start_time: '09:15', end_time: '09:30', is_booked: true, is_manually_disabled: false, available: false },
  { id: 3, start_time: '09:30', end_time: '09:45', is_booked: false, is_manually_disabled: false, available: true },
  { id: 4, start_time: '09:45', end_time: '10:00', is_booked: false, is_manually_disabled: true, available: false },
  { id: 5, start_time: '10:00', end_time: '10:15', is_booked: false, is_manually_disabled: false, available: true },
  { id: 6, start_time: '10:15', end_time: '10:30', is_booked: false, is_manually_disabled: false, available: true },
  { id: 7, start_time: '11:00', end_time: '11:15', is_booked: true, is_manually_disabled: false, available: false },
  { id: 8, start_time: '11:15', end_time: '11:30', is_booked: false, is_manually_disabled: false, available: true },
];

const DoctorAvailability = () => {
  const { toasts, removeToast, success, info } = useToast();

  // Selection state
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 5)); // June 2026

  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Slot details state for selectedDate
  const [slotsByDoc, setSlotsByDoc] = useState({});
  const [loadingSlotsMap, setLoadingSlotsMap] = useState({});

  // Set default date to today
  useEffect(() => {
    setSelectedDate(getTodayDateString());
  }, []);

  // Fetch Departments
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiFetch('/departments');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setDepartments(data);
        if (data.length > 0) {
          setSelectedDeptId(data[0].id);
        }
      } else {
        throw new Error('Failed to fetch departments');
      }
    } catch (err) {
      console.warn('API connection failed. Using mock departments.', err);
      setDepartments(mockDepts);
      setSelectedDeptId(mockDepts[0].id);
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
        const data = json.data || json;
        setDoctors(data);
      } else {
        throw new Error('Failed to fetch doctors list');
      }
    } catch (err) {
      console.warn('API connection failed. Using mock doctors list.', err);
      setDoctors(mockDocs);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, [fetchDepartments, fetchDoctors]);

  // Filter doctors based on selected department
  const filteredDoctors = useMemo(() => {
    return selectedDeptId
      ? doctors.filter(doc => doc.department_id === Number(selectedDeptId))
      : doctors;
  }, [doctors, selectedDeptId]);

  // Auto-select doctor option when department changes or selection becomes invalid
  useEffect(() => {
    if (filteredDoctors.length > 0) {
      const isCurrentDocValid = selectedDocId === '' || filteredDoctors.some(doc => doc.id === Number(selectedDocId));
      if (!isCurrentDocValid) {
        setSelectedDocId(''); // default to All Doctors
      }
    } else {
      setSelectedDocId('');
    }
  }, [filteredDoctors, selectedDocId]);

  // Fetch slot data for all active doctors on the selected date
  const fetchAllActiveSlots = useCallback(async () => {
    if (!selectedDate) return;
    
    const activeDocs = selectedDocId 
      ? doctors.filter(d => d.id === Number(selectedDocId))
      : filteredDoctors;
      
    const newSlotsMap = {};
    const newLoadingMap = {};
    
    activeDocs.forEach(d => {
      newLoadingMap[d.id] = true;
    });
    setLoadingSlotsMap(newLoadingMap);

    await Promise.all(activeDocs.map(async (doc) => {
      try {
        const res = await apiFetch(`/doctors/${doc.id}/slots?date=${selectedDate}`);
        if (res.ok) {
          const json = await res.json();
          newSlotsMap[doc.id] = (json.data || json).slots || [];
        } else {
          throw new Error();
        }
      } catch (err) {
        // local storage mockup fallback
        const localAppsStr = localStorage.getItem('nemcare_appointments');
        const localApps = localAppsStr ? JSON.parse(localAppsStr) : [];

        const localOverridesStr = localStorage.getItem('nemcare_availability_overrides');
        const localOverrides = localOverridesStr ? JSON.parse(localOverridesStr) : {};

        const currentSlots = defaultMockSlots.map(s => {
          const isBooked = localApps.some(app => 
            app.doctor_id === doc.id && 
            app.date === selectedDate && 
            (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
            app.status === 'booked'
          );

          const overrideKey = `${doc.id}-${selectedDate}-${s.id}`;
          const isManuallyDisabled = localOverrides[overrideKey] !== undefined 
            ? localOverrides[overrideKey] 
            : s.is_manually_disabled;

          return {
            ...s,
            is_booked: isBooked,
            is_manually_disabled: !isBooked && isManuallyDisabled,
            available: !isBooked && !isManuallyDisabled
          };
        });
        newSlotsMap[doc.id] = currentSlots;
      } finally {
        setLoadingSlotsMap(prev => ({ ...prev, [doc.id]: false }));
      }
    }));
    
    setSlotsByDoc(newSlotsMap);
  }, [selectedDate, selectedDocId, doctors, filteredDoctors]);

  // Re-fetch when date or doctor changes
  useEffect(() => {
    fetchAllActiveSlots();
  }, [fetchAllActiveSlots]);

  // Fetch slots single doctor helper
  const fetchSingleDoctorSlots = async (docId) => {
    try {
      const res = await apiFetch(`/doctors/${docId}/slots?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        setSlotsByDoc(prev => ({
          ...prev,
          [docId]: (json.data || json).slots || []
        }));
      } else {
        throw new Error();
      }
    } catch (err) {
      const localAppsStr = localStorage.getItem('nemcare_appointments');
      const localApps = localAppsStr ? JSON.parse(localAppsStr) : [];

      const localOverridesStr = localStorage.getItem('nemcare_availability_overrides');
      const localOverrides = localOverridesStr ? JSON.parse(localOverridesStr) : {};

      const currentSlots = defaultMockSlots.map(s => {
        const isBooked = localApps.some(app => 
          app.doctor_id === docId && 
          app.date === selectedDate && 
          (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
          app.status === 'booked'
        );

        const overrideKey = `${docId}-${selectedDate}-${s.id}`;
        const isManuallyDisabled = localOverrides[overrideKey] !== undefined 
          ? localOverrides[overrideKey] 
          : s.is_manually_disabled;

        return {
          ...s,
          is_booked: isBooked,
          is_manually_disabled: !isBooked && isManuallyDisabled,
          available: !isBooked && !isManuallyDisabled
        };
      });

      setSlotsByDoc(prev => ({
        ...prev,
        [docId]: currentSlots
      }));
    }
  };

  // Toggle Slot override
  const handleToggleSlot = async (docId, slot, nextDisabledState) => {
    if (slot.is_booked) {
      info("Booked appointments cannot be disabled. Cancel the booking first.");
      return;
    }

    if (slot.is_manually_disabled === nextDisabledState) {
      return; // No change
    }

    try {
      const res = await apiFetch(`/doctors/${docId}/slots/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          slot_id: slot.id,
          date: selectedDate,
          is_disabled: nextDisabledState
        })
      });

      if (res.ok) {
        success(`Slot availability updated!`);
        fetchSingleDoctorSlots(docId);
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to toggle availability');
      }
    } catch (err) {
      console.warn('API toggle failed. Modifying local state (offline mode).', err);
      
      // Update our offline database cache in localStorage
      const localOverridesStr = localStorage.getItem('nemcare_availability_overrides');
      const localOverrides = localOverridesStr ? JSON.parse(localOverridesStr) : {};
      
      const overrideKey = `${docId}-${selectedDate}-${slot.id}`;
      localOverrides[overrideKey] = nextDisabledState;
      localStorage.setItem('nemcare_availability_overrides', JSON.stringify(localOverrides));

      fetchSingleDoctorSlots(docId);
      success(`Slot availability updated (offline mode)!`);
    }
  };

  // Navigate calendar months
  const handlePrevMonth = () => {
    const today = new Date();
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    if (prevMonth.getFullYear() < today.getFullYear() || 
        (prevMonth.getFullYear() === today.getFullYear() && prevMonth.getMonth() < today.getMonth())) {
      return;
    }
    setCurrentMonth(prevMonth);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatDateString = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Calculate grid cells for the monthly calendar
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const calendarCells = [];
  
  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const cellDate = new Date(year, month, i);
    calendarCells.push({
      date: cellDate,
      isCurrentMonth: true,
      dayNumber: i
    });
  }

  // Filter out cells that have passed (before current date)
  const todayVal = new Date();
  todayVal.setHours(0, 0, 0, 0);

  const filteredCells = calendarCells.filter(cell => {
    const cellDate = new Date(cell.date);
    cellDate.setHours(0, 0, 0, 0);
    return cellDate >= todayVal;
  });

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Availability Calendar</h1>
        <p className="text-slate-400 text-xs mt-1">Override default doctor scheduling templates. Set active/disabled statuses for day slots.</p>
      </div>

      {/* Selection Control Panel */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Select Department */}
        <div className="w-full">
          <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block flex items-center gap-1">
            <FiLayers /> Select Department
          </label>
          <div className="relative">
            <select
              className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
              value={selectedDeptId}
              onChange={(e) => {
                setSelectedDeptId(e.target.value);
                setSelectedDocId('');
              }}
              disabled={loadingDepts}
            >
              {loadingDepts ? (
                <option>Loading departments...</option>
              ) : (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Select Doctor */}
        <div className="w-full">
          <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block flex items-center gap-1">
            <FiUser /> Select Doctor
          </label>
          <div className="relative">
            <select
              className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              disabled={loadingDocs || filteredDoctors.length === 0}
            >
              {loadingDocs ? (
                <option>Loading doctors...</option>
              ) : filteredDoctors.length === 0 ? (
                <option value="">No doctors in this dept</option>
              ) : (
                <>
                  <option value="">All Doctors (Overall Summary)</option>
                  {filteredDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.name.replace(/^Dr\.\s+/i, '')} ({doc.designation})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Grid calendar monthly overview */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              Select any active date card below to configure scheduling slots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {(() => {
              const today = new Date();
              const isPrevDisabled = currentMonth.getFullYear() < today.getFullYear() || 
                (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() <= today.getMonth());
              return (
                <>
                  <button
                    onClick={handlePrevMonth}
                    disabled={isPrevDisabled}
                    className={`p-2.5 border rounded-xl transition duration-200 ${
                      isPrevDisabled 
                        ? 'border-slate-100 text-slate-300 bg-slate-50/50 cursor-not-allowed' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl transition duration-200 cursor-pointer text-slate-600"
                  >
                    <FiChevronRight />
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        {/* Date Cards Grid */}
        {filteredCells.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 font-medium">No active dates available for configuration in this month.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
            {filteredCells.map((cell, idx) => {
              const dateStr = formatDateString(cell.date);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative overflow-hidden bg-white border rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] select-none transition-all duration-200 cursor-pointer hover:border-[#960c0c]/40 hover:shadow-xs ${
                    isSelected
                      ? 'border-[#960c0c] ring-2 ring-[#960c0c]/10 bg-red-50/5'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Month badge angled corner strip */}
                  <div className="absolute top-0 left-0 w-12 h-12 overflow-hidden pointer-events-none">
                    <div className={`absolute transform -rotate-45 text-center text-[7.5px] font-black uppercase tracking-wider py-0.5 w-[70px] -left-[20px] top-[9px] shadow-3xs ${
                      isSelected 
                        ? 'bg-[#960c0c] text-white' 
                        : 'bg-slate-100 text-slate-500 border-b border-slate-200/30'
                    }`}>
                      {cell.date.toLocaleString('default', { month: 'short' })}
                    </div>
                  </div>

                  {/* Only show the date */}
                  <span className={`text-2xl font-black mt-2 ${isSelected ? 'text-[#960c0c]' : 'text-slate-800'}`}>
                    {cell.dayNumber}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Details & Override Panel */}
      {selectedDate && (
        <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Availability Override Configuration
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Showing config slots for date: <span className="font-bold text-slate-700">{new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>. Restrict past selections starting from today.
              </p>
            </div>

            {/* Indicators */}
            <div className="flex flex-wrap gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-455 shrink-0" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>Manually Disabled</span>
              </div>
            </div>
          </div>

          {/* Active doctors schedules list */}
          <div className="space-y-8">
            {(selectedDocId ? doctors.filter(d => d.id === Number(selectedDocId)) : filteredDoctors).map((doc) => {
              const docSlots = slotsByDoc[doc.id] || [];
              const isLoading = loadingSlotsMap[doc.id];

              return (
                <div key={doc.id} className="space-y-4 p-5 border border-slate-100 bg-slate-50/30 rounded-2xl">
                  {/* Doctor Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Dr. {doc.name.replace(/^Dr\.\s+/i, '')}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{doc.designation}</p>
                    </div>
                  </div>

                  {/* Doctor slots grid */}
                  {isLoading ? (
                    <p className="text-xs text-slate-400 animate-pulse py-2">Loading slots details...</p>
                  ) : docSlots.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No operational slots configured.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {docSlots.map((slot) => {
                        let statusClasses = '';

                        if (slot.is_booked) {
                          statusClasses = 'bg-slate-50 border-slate-200 text-slate-505';
                        } else if (slot.is_manually_disabled) {
                          statusClasses = 'bg-rose-50/45 border-rose-200/50 text-rose-700';
                        } else {
                          statusClasses = 'bg-emerald-50/45 border-emerald-200/50 text-emerald-700';
                        }

                        return (
                          <div
                            key={slot.id}
                            className={`flex flex-col gap-3 p-3.5 rounded-xl border shadow-3xs transition-all duration-200 ${statusClasses}`}
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <FiClock className={`text-xs ${slot.is_booked ? 'text-slate-400' : slot.is_manually_disabled ? 'text-rose-500' : 'text-emerald-500'}`} />
                                <span className="font-bold text-[11px] text-slate-800">{formatSlotRange(slot.start_time, slot.end_time)}</span>
                              </div>
                              
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                slot.is_booked
                                  ? 'bg-slate-200 text-slate-650'
                                  : slot.is_manually_disabled
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200/20'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200/20'
                              }`}>
                                {slot.is_booked ? 'Booked' : slot.is_manually_disabled ? 'Disabled' : 'Available'}
                              </span>
                            </div>

                            {/* Radio controls */}
                            {slot.is_booked ? (
                              <div className="text-[9.5px] text-slate-400 font-semibold italic mt-1 bg-slate-100/50 p-2 rounded-lg border border-slate-200/30 text-center">
                                Booked (Locked)
                              </div>
                            ) : (
                              <div className="flex items-center gap-4 mt-1 bg-white/70 p-2 rounded-lg border border-slate-100 shadow-3xs justify-center">
                                <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-extrabold uppercase tracking-wider text-slate-650 select-none">
                                  <input
                                    type="radio"
                                    name={`slot-status-${doc.id}-${slot.id}`}
                                    checked={!slot.is_manually_disabled}
                                    onChange={() => handleToggleSlot(doc.id, slot, false)}
                                    className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                                  />
                                  <span className={!slot.is_manually_disabled ? 'text-emerald-600 font-black' : 'text-slate-400 font-bold'}>
                                    Enable
                                  </span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] font-extrabold uppercase tracking-wider text-slate-650 select-none">
                                  <input
                                    type="radio"
                                    name={`slot-status-${doc.id}-${slot.id}`}
                                    checked={slot.is_manually_disabled}
                                    onChange={() => handleToggleSlot(doc.id, slot, true)}
                                    className="text-rose-600 focus:ring-rose-500 h-3.5 w-3.5 cursor-pointer accent-rose-600"
                                  />
                                  <span className={slot.is_manually_disabled ? 'text-rose-600 font-black' : 'text-slate-400 font-bold'}>
                                    Disable
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailability;
