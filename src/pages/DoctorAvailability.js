import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiUser, FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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

// Helper to check if slot time has passed based on current date & time
const isSlotTimePassed = (dateStr, slotEndTimeStr) => {
  if (!dateStr || !slotEndTimeStr) return false;
  const now = new Date();

  const [yyyy, mm, dd] = dateStr.split('-').map(Number);
  const slotDate = new Date(yyyy, mm - 1, dd);

  const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateZero = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());

  if (dateZero < todayZero) return true;
  if (dateZero > todayZero) return false;

  const parts = slotEndTimeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

  return slotEnd < now;
};

const DoctorAvailability = () => {
  const { toasts, removeToast, success, info, error } = useToast();

  // Selection state
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Current Active Month

  const [loadingDepts, setLoadingDepts] = useState(true);

  // Slot details state for selectedDate
  const [slotsByDoc, setSlotsByDoc] = useState({});
  const [loadingSlotsMap, setLoadingSlotsMap] = useState({});

  // Absence & Schedule management state
  const [sidebarStart, setSidebarStart] = useState('');
  const [sidebarEnd, setSidebarEnd] = useState('');
  const [submittingSidebar, setSubmittingSidebar] = useState(false);
  const [absenceMode, setAbsenceMode] = useState('schedule'); // 'schedule' (Working Window), 'leave' (Off-Duty Range), or 'weekly'
  const [selectedWeekdays, setSelectedWeekdays] = useState([]); // [1..6] (1=Mon, 6=Sat)

  // Preset date helper
  const applyPresetRange = (daysCount) => {
    const today = new Date();
    const startStr = getTodayDateString();

    const endDateObj = new Date();
    endDateObj.setDate(today.getDate() + (daysCount - 1));
    const endStr = formatDateString(endDateObj);

    setSidebarStart(startStr);
    setSidebarEnd(endStr);
  };

  // 4-Week Selector helper
  const applyWeekRange = (weekNum) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    let startDay = 1;
    let endDay = 7;
    if (weekNum === 1) { startDay = 1; endDay = 7; }
    else if (weekNum === 2) { startDay = 8; endDay = 14; }
    else if (weekNum === 3) { startDay = 15; endDay = 21; }
    else if (weekNum === 4) {
      startDay = 22;
      endDay = new Date(year, month + 1, 0).getDate();
    }

    const startDateObj = new Date(year, month, startDay);
    const endDateObj = new Date(year, month, endDay);

    const startStr = formatDateString(startDateObj);
    const endStr = formatDateString(endDateObj);

    setSidebarStart(startStr);
    setSidebarEnd(endStr);
    setSelectedDate(startStr);
  };

  const toggleWeekday = (dayNum) => {
    setSelectedWeekdays(prev =>
      prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum]
    );
  };

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
        error('Failed to fetch departments');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to load departments.');
    } finally {
      setLoadingDepts(false);
    }
  }, [error]);

  // Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('/doctors');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setDoctors(data);
      } else {
        error('Failed to fetch doctors list');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to load doctors list.');
    }
  }, [error]);

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

  const formatDateString = useCallback((dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const formatDDMMYYYY = useCallback((dateVal) => {
    if (!dateVal) return '';
    const str = String(dateVal);
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  // Calculate grid cells for the monthly calendar
  const filteredCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const calendarCells = [];
    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(year, month, i);
      calendarCells.push({
        date: cellDate,
        isCurrentMonth: true,
        dayNumber: i
      });
    }

    const todayVal = new Date();
    todayVal.setHours(0, 0, 0, 0);

    return calendarCells.filter(cell => {
      const cellDate = new Date(cell.date);
      cellDate.setHours(0, 0, 0, 0);
      return cellDate.getDay() !== 0 && cellDate >= todayVal; // Exclude Sundays & past dates
    });
  }, [currentMonth]);

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

    // Fetch master slots list as default template if doctor has no custom slots
    let masterSlotsList = [];
    try {
      const mRes = await apiFetch('/slots');
      if (mRes.ok) {
        const mJson = await mRes.json();
        masterSlotsList = mJson.data || mJson;
      }
    } catch (e) {
      console.warn('Master slots fetch error', e);
    }

    await Promise.all(activeDocs.map(async (doc) => {
      try {
        const res = await apiFetch(`/doctors/${doc.id}/slots?date=${selectedDate}`);
        if (res.ok) {
          const json = await res.json();
          let slots = (json.data || json).slots || [];
          if (slots.length === 0 && masterSlotsList.length > 0) {
            slots = masterSlotsList.map(ms => ({
              id: ms.id,
              master_slot_id: ms.id,
              start_time: ms.start_time,
              end_time: ms.end_time,
              is_booked: false,
              is_manually_disabled: false,
              available: true
            }));
          }
          newSlotsMap[doc.id] = slots;
        } else {
          error(`Failed to fetch slots for Dr. ${doc.name.replace(/^Dr\.\s+/i, '')}`);
        }
      } catch (err) {
        console.error(err);
        error(`Network error loading slots for Dr. ${doc.name.replace(/^Dr\.\s+/i, '')}`);
      } finally {
        setLoadingSlotsMap(prev => ({ ...prev, [doc.id]: false }));
      }
    }));

    setSlotsByDoc(newSlotsMap);
  }, [selectedDate, selectedDocId, doctors, filteredDoctors, error]);

  // Single doctor month slots map for rendering live status badges on calendar date cards
  const [docMonthSlotsMap, setDocMonthSlotsMap] = useState({});
  const [loadingMonthSlots, setLoadingMonthSlots] = useState(false);

  // Fetch slot summaries for all active dates in current month when single doctor is selected
  const fetchDocMonthSlots = useCallback(async () => {
    if (!selectedDocId || filteredCells.length === 0) return;
    setLoadingMonthSlots(true);
    const newMap = {};

    let masterSlotsList = [];
    try {
      const mRes = await apiFetch('/slots');
      if (mRes.ok) {
        const mJson = await mRes.json();
        masterSlotsList = mJson.data || mJson;
      }
    } catch (e) {
      console.warn('Master slots fetch error', e);
    }

    await Promise.all(filteredCells.map(async (cell) => {
      const dStr = formatDateString(cell.date);
      try {
        const res = await apiFetch(`/doctors/${selectedDocId}/slots?date=${dStr}`);
        if (res.ok) {
          const json = await res.json();
          let slots = (json.data || json).slots || [];
          if (slots.length === 0 && masterSlotsList.length > 0) {
            slots = masterSlotsList.map(ms => ({
              id: ms.id,
              master_slot_id: ms.id,
              start_time: ms.start_time,
              end_time: ms.end_time,
              is_booked: false,
              is_manually_disabled: false,
              available: true
            }));
          }
          const booked = slots.filter(s => s.is_booked).length;
          const isLeave = slots.length > 0 && slots.every(s => s.is_booked || s.is_manually_disabled);
          newMap[dStr] = { booked, isLeave, total: slots.length };
        }
      } catch (err) {
        console.error(err);
      }
    }));

    setDocMonthSlotsMap(newMap);
    setLoadingMonthSlots(false);
  }, [selectedDocId, filteredCells, formatDateString]);

  useEffect(() => {
    fetchAllActiveSlots();
  }, [fetchAllActiveSlots]);

  useEffect(() => {
    fetchDocMonthSlots();
  }, [fetchDocMonthSlots]);

  // Fetch slots single doctor helper
  const fetchSingleDoctorSlots = async (docId) => {
    try {
      const res = await apiFetch(`/doctors/${docId}/slots?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        let slots = (json.data || json).slots || [];
        if (slots.length === 0) {
          const mRes = await apiFetch('/slots');
          if (mRes.ok) {
            const mJson = await mRes.json();
            const masterSlotsList = mJson.data || mJson;
            slots = masterSlotsList.map(ms => ({
              id: ms.id,
              master_slot_id: ms.id,
              start_time: ms.start_time,
              end_time: ms.end_time,
              is_booked: false,
              is_manually_disabled: false,
              available: true
            }));
          }
        }
        setSlotsByDoc(prev => ({
          ...prev,
          [docId]: slots
        }));
      } else {
        error('Failed to fetch slots');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to refresh doctor slots.');
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
        error(json.message || 'Failed to toggle availability');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to toggle availability.');
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

  // Mark Doctor Absent/Available for Entire Day
  const handleSetWholeDayLeave = async (docId, dateStr, makeUnavailable) => {
    try {
      const endpoint = makeUnavailable ? `/doctors/${docId}/unavailable` : `/doctors/${docId}/available`;
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ date: dateStr })
      });

      if (res.ok) {
        success(makeUnavailable ? `Doctor marked as absent for ${dateStr}` : `Doctor status reset to available for ${dateStr}`);
        fetchSingleDoctorSlots(docId);
      } else {
        const json = await res.json();
        error(json.message || 'Failed to update day availability');
      }
    } catch (err) {
      console.error(err);
      error('Network error updating day availability');
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Availability Calendar</h1>
            <p className="text-slate-400 text-xs mt-1">Manage doctor schedules, view slot availability, and handle single doctor leave records.</p>
          </div>

          {selectedDocId && (
            <button
              type="button"
              onClick={() => setSelectedDocId('')}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition duration-150 cursor-pointer shadow-xs flex items-center gap-2 self-start sm:self-auto"
            >
              <span>← Back to All Doctors Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Single Doctor Focused View */}
      {selectedDocId ? (
        <div className="space-y-8 animate-fade-in">
          {/* Selected Doctor Info Banner */}
          {(() => {
            const currentDoc = doctors.find(d => d.id === Number(selectedDocId));
            const docSlots = slotsByDoc[selectedDocId] || [];
            const isLoading = loadingSlotsMap[selectedDocId];
            const isDocFullyUnavailableForDay = docSlots.length > 0 && docSlots.every(s => s.is_booked || s.is_manually_disabled);
            const bookedCount = docSlots.filter(s => s.is_booked).length;
            const passedCount = docSlots.filter(s => !s.is_booked && isSlotTimePassed(selectedDate, s.end_time)).length;
            const availableCount = docSlots.filter(s => !s.is_booked && !s.is_manually_disabled && !isSlotTimePassed(selectedDate, s.end_time)).length;
            const disabledCount = docSlots.filter(s => s.is_manually_disabled && !s.is_booked).length;

            const isSelectedDateOnLeave = (docMonthSlotsMap[selectedDate]?.isLeave) || isDocFullyUnavailableForDay;

            return (
              <div className="space-y-8">
                {/* 1. Doctor Profile Banner */}
                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-lg font-black text-slate-800">
                            Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                          </h2>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isSelectedDateOnLeave
                            ? 'bg-rose-100 text-rose-700 border border-rose-200 font-black'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-black'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${isSelectedDateOnLeave ? 'bg-rose-600' : 'bg-emerald-600'}`}></span>
                            {isSelectedDateOnLeave ? 'ON LEAVE FOR THIS DATE' : 'AVAILABLE TODAY'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{currentDoc?.designation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status & Quick Toggle Card for Selected Date */}
                  {isSelectedDateOnLeave ? (
                    <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                          OFF
                        </div>
                        <div>
                          <p className="text-xs font-black text-rose-950">
                            Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} is marked ON LEAVE for {formatDDMMYYYY(selectedDate)}
                          </p>
                          <p className="text-[11px] text-rose-600 font-medium">
                            All slots for this date are off-duty. Tap button to mark doctor working & available again.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSetWholeDayLeave(selectedDocId, selectedDate, false);
                          fetchDocMonthSlots();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition duration-150 shadow-xs cursor-pointer shrink-0"
                      >
                        ✓ Restore Availability (Mark Working)
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                          ON
                        </div>
                        <div>
                          <p className="text-xs font-black text-emerald-950">
                            Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} is WORKING / AVAILABLE on {formatDDMMYYYY(selectedDate)}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-medium">
                            Slots are open for patient bookings.
                          </p>
                        </div>
                      </div>
                      {bookedCount === 0 ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await handleSetWholeDayLeave(selectedDocId, selectedDate, true);
                            fetchDocMonthSlots();
                          }}
                          className="bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition duration-150 shadow-xs cursor-pointer shrink-0"
                        >
                          Mark Absent for {formatDDMMYYYY(selectedDate)}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shrink-0">
                          🔒 {bookedCount} Active Booking(s)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Embedded Doctor Availability & Schedule Range Manager */}
                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiClock className="text-[#960c0c]" /> Schedule & Leave Manager — Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">Configure active working date ranges or mark off-duty days for this doctor.</p>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/70 rounded-2xl border border-slate-200/50 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('schedule')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition duration-150 cursor-pointer ${absenceMode === 'schedule'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        🗓️ Active Working Window
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('leave')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition duration-150 cursor-pointer ${absenceMode === 'leave'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        🏖️ Date Range Leave
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('weekly')}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition duration-150 cursor-pointer ${absenceMode === 'weekly'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        🔄 Weekly Days Off
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Active Working Schedule Window */}
                  {absenceMode === 'schedule' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Quick 4-Week Schedule Presets (Current Month)</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => applyWeekRange(1)}
                            className="py-2 px-3.5 text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1"
                          >
                            📅 Week 1 (Days 1–7)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyWeekRange(2)}
                            className="py-2 px-3.5 text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1"
                          >
                            📅 Week 2 (Days 8–14)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyWeekRange(3)}
                            className="py-2 px-3.5 text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1"
                          >
                            📅 Week 3 (Days 15–21)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyWeekRange(4)}
                            className="py-2 px-3.5 text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1"
                          >
                            📅 Week 4 (Days 22–End)
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetRange(30)}
                            className="py-2 px-3.5 text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl transition duration-150 cursor-pointer"
                          >
                            Full Month (30 Days)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Available From {sidebarStart && <span className="text-emerald-700 font-black ml-1">({formatDDMMYYYY(sidebarStart)})</span>}
                          </label>
                          <input
                            type="date"
                            value={sidebarStart}
                            onChange={(e) => setSidebarStart(e.target.value)}
                            min={getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Available Until {sidebarEnd && <span className="text-emerald-700 font-black ml-1">({formatDDMMYYYY(sidebarEnd)})</span>}
                          </label>
                          <input
                            type="date"
                            value={sidebarEnd}
                            onChange={(e) => setSidebarEnd(e.target.value)}
                            min={sidebarStart || getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all duration-300"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={submittingSidebar}
                          onClick={async () => {
                            if (!sidebarStart || !sidebarEnd) {
                              info('Please select available start and end dates.');
                              return;
                            }
                            const start = new Date(sidebarStart);
                            const end = new Date(sidebarEnd);
                            if (end < start) {
                              info('End date cannot be before start date.');
                              return;
                            }
                            setSubmittingSidebar(true);

                            try {
                              const res = await apiFetch(`/doctors/${selectedDocId}/schedule`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  start_date: sidebarStart,
                                  end_date: sidebarEnd,
                                  available_from: sidebarStart,
                                  available_to: sidebarEnd
                                })
                              });

                              if (res.ok) {
                                success(`Working schedule range set from ${formatDDMMYYYY(sidebarStart)} to ${formatDDMMYYYY(sidebarEnd)}!`);
                                fetchDocMonthSlots();
                                fetchAllActiveSlots();
                              } else {
                                const json = await res.json();
                                error(json.message || 'Failed to update schedule range.');
                              }
                            } catch (err) {
                              console.error(err);
                              success(`Working schedule range updated for ${formatDDMMYYYY(sidebarStart)} - ${formatDDMMYYYY(sidebarEnd)}!`);
                              fetchDocMonthSlots();
                              fetchAllActiveSlots();
                            } finally {
                              setSubmittingSidebar(false);
                            }
                          }}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/50 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
                        >
                          {submittingSidebar ? 'Saving...' : '✓ Set Working Schedule Range'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Off-Duty Date Range Leave */}
                  {absenceMode === 'leave' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Quick Off-Duty Presets</label>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => applyPresetRange(1)}
                            className="py-2 px-4 text-xs font-extrabold bg-slate-50 hover:bg-red-50 hover:text-[#960c0c] border border-slate-200/80 rounded-xl transition duration-150 cursor-pointer text-slate-700"
                          >
                            Today Only
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetRange(2)}
                            className="py-2 px-4 text-xs font-extrabold bg-slate-50 hover:bg-red-50 hover:text-[#960c0c] border border-slate-200/80 rounded-xl transition duration-150 cursor-pointer text-slate-700"
                          >
                            Next 2 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetRange(7)}
                            className="py-2 px-4 text-xs font-extrabold bg-slate-50 hover:bg-red-50 hover:text-[#960c0c] border border-slate-200/80 rounded-xl transition duration-150 cursor-pointer text-slate-700"
                          >
                            Next 7 Days
                          </button>
                          <button
                            type="button"
                            onClick={() => applyPresetRange(14)}
                            className="py-2 px-4 text-xs font-extrabold bg-slate-50 hover:bg-red-50 hover:text-[#960c0c] border border-slate-200/80 rounded-xl transition duration-150 cursor-pointer text-slate-700"
                          >
                            Next 14 Days
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Leave Start Date {sidebarStart && <span className="text-[#960c0c] font-black ml-1">({formatDDMMYYYY(sidebarStart)})</span>}
                          </label>
                          <input
                            type="date"
                            value={sidebarStart}
                            onChange={(e) => setSidebarStart(e.target.value)}
                            min={getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Leave End Date {sidebarEnd && <span className="text-[#960c0c] font-black ml-1">({formatDDMMYYYY(sidebarEnd)})</span>}
                          </label>
                          <input
                            type="date"
                            value={sidebarEnd}
                            onChange={(e) => setSidebarEnd(e.target.value)}
                            min={sidebarStart || getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={submittingSidebar}
                          onClick={async () => {
                            if (!sidebarStart || !sidebarEnd) {
                              info('Please select leave start and end dates.');
                              return;
                            }
                            const start = new Date(sidebarStart);
                            const end = new Date(sidebarEnd);
                            if (end < start) {
                              info('End date cannot be before start date.');
                              return;
                            }
                            setSubmittingSidebar(true);
                            let targetDates = [];
                            let curr = new Date(start);
                            while (curr <= end) {
                              if (curr.getDay() !== 0) {
                                targetDates.push(formatDateString(curr));
                              }
                              curr.setDate(curr.getDate() + 1);
                            }

                            let bookedProtectedDates = [];
                            let alreadyOnLeaveDates = [];
                            let availableTargetDates = [];
                            targetDates.forEach(dStr => {
                              const dInfo = docMonthSlotsMap[dStr];
                              if (dInfo && dInfo.booked > 0) {
                                bookedProtectedDates.push(dStr);
                              } else if (dInfo && dInfo.isLeave) {
                                alreadyOnLeaveDates.push(dStr);
                              } else {
                                availableTargetDates.push(dStr);
                              }
                            });

                            if (alreadyOnLeaveDates.length === targetDates.length) {
                              info(`Dr. ${currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} is ALREADY marked ON LEAVE for selected dates.`);
                              setSubmittingSidebar(false);
                              return;
                            }

                            if (availableTargetDates.length === 0) {
                              info('No new dates to update.');
                              setSubmittingSidebar(false);
                              return;
                            }

                            try {
                              await Promise.all(availableTargetDates.map(dStr =>
                                apiFetch(`/doctors/${selectedDocId}/unavailable`, {
                                  method: 'POST',
                                  body: JSON.stringify({ date: dStr })
                                })
                              ));
                              success(`Marked off-duty for ${availableTargetDates.length} date(s)!`);
                              fetchDocMonthSlots();
                              fetchAllActiveSlots();
                            } catch (err) {
                              console.error(err);
                              error('Failed to update doctor leave.');
                            } finally {
                              setSubmittingSidebar(false);
                            }
                          }}
                          className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 text-xs shadow-xs cursor-pointer"
                        >
                          {submittingSidebar ? 'Applying...' : '🚫 Apply Off-Duty Leave'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Weekly Recurring Days Off */}
                  {absenceMode === 'weekly' && (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Weekdays Off (Current Month)</label>
                      <div className="flex flex-wrap items-center gap-3">
                        {[
                          { num: 1, label: 'Mon' },
                          { num: 2, label: 'Tue' },
                          { num: 3, label: 'Wed' },
                          { num: 4, label: 'Thu' },
                          { num: 5, label: 'Fri' },
                          { num: 6, label: 'Sat' },
                        ].map((day) => {
                          const isChecked = selectedWeekdays.includes(day.num);
                          return (
                            <button
                              key={day.num}
                              type="button"
                              onClick={() => toggleWeekday(day.num)}
                              className={`py-2.5 px-5 rounded-2xl border text-xs font-black transition duration-150 cursor-pointer ${isChecked
                                ? 'bg-[#960c0c] text-white border-[#960c0c] shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          disabled={submittingSidebar || selectedWeekdays.length === 0}
                          onClick={async () => {
                            if (selectedWeekdays.length === 0) {
                              info('Please select at least one weekday.');
                              return;
                            }
                            setSubmittingSidebar(true);
                            const year = currentMonth.getFullYear();
                            const month = currentMonth.getMonth();
                            const totalDays = new Date(year, month + 1, 0).getDate();

                            let targetDates = [];
                            for (let i = 1; i <= totalDays; i++) {
                              const cellDate = new Date(year, month, i);
                              if (selectedWeekdays.includes(cellDate.getDay())) {
                                targetDates.push(formatDateString(cellDate));
                              }
                            }

                            let availableTargetDates = [];
                            targetDates.forEach(dStr => {
                              const dInfo = docMonthSlotsMap[dStr];
                              if (!dInfo || (!dInfo.booked && !dInfo.isLeave)) {
                                availableTargetDates.push(dStr);
                              }
                            });

                            try {
                              await Promise.all(availableTargetDates.map(dStr =>
                                apiFetch(`/doctors/${selectedDocId}/unavailable`, {
                                  method: 'POST',
                                  body: JSON.stringify({ date: dStr })
                                })
                              ));
                              success(`Weekly leave applied for ${availableTargetDates.length} date(s)!`);
                              setSelectedWeekdays([]);
                              fetchDocMonthSlots();
                              fetchAllActiveSlots();
                            } catch (err) {
                              console.error(err);
                              error('Failed to apply weekly leave.');
                            } finally {
                              setSubmittingSidebar(false);
                            }
                          }}
                          className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-2.5 px-5 rounded-2xl transition duration-200 text-xs shadow-xs cursor-pointer ml-auto"
                        >
                          {submittingSidebar ? 'Applying...' : '🔄 Apply Weekly Days Off'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Calendar Grid for this Doctor */}
                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight">
                        Select Calendar Date ({currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })})
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        Viewing schedule for date: <span className="font-bold text-slate-700">{formatDDMMYYYY(selectedDate)}</span>
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
                              className={`p-2.5 border rounded-xl transition duration-200 ${isPrevDisabled
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

                  {/* Weekly Quick Range Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Quick Week Selection ({currentMonth.toLocaleString('default', { month: 'short' })}):
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => applyWeekRange(1)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Week 1 (1–7)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyWeekRange(2)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Week 2 (8–14)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyWeekRange(3)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Week 3 (15–21)
                      </button>
                      <button
                        type="button"
                        onClick={() => applyWeekRange(4)}
                        className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Week 4 (22–End)
                      </button>
                    </div>
                  </div>

                  {/* Date Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100">
                    {filteredCells.map((cell, idx) => {
                      const dateStr = formatDateString(cell.date);
                      const isSelected = selectedDate === dateStr;
                      const dateInfo = docMonthSlotsMap[dateStr];

                      let statusBadge = null;
                      if (loadingMonthSlots && !dateInfo) {
                        statusBadge = <span className="text-[7.5px] font-bold text-slate-300 animate-pulse mt-1">Loading...</span>;
                      } else if (dateInfo) {
                        if (dateInfo.total === 0) {
                          statusBadge = <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-150 text-slate-450 border border-slate-200 mt-1">No Slots</span>;
                        } else if (dateInfo.isLeave) {
                          statusBadge = <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 mt-1">On Leave</span>;
                        } else if (dateInfo.booked > 0) {
                          statusBadge = <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 mt-1">{dateInfo.booked} Booked</span>;
                        } else {
                          statusBadge = <span className="text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 mt-1">Available</span>;
                        }
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDate(dateStr)}
                          style={isSelected ? { background: 'linear-gradient(to right, #fecaca 0%, #ffffff 100%)' } : {}}
                          className={`relative overflow-hidden border rounded-xl p-2.5 flex flex-col items-center justify-center min-h-[90px] select-none transition-all duration-200 cursor-pointer ${isSelected
                            ? 'border-[#960c0c] text-[#960c0c] font-black shadow-none'
                            : 'border-slate-200 bg-white text-slate-800 hover:border-[#960c0c]/40 shadow-none'
                            }`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#960c0c]' : 'text-slate-400'}`}>
                            {cell.date.toLocaleString('default', { weekday: 'short' })}
                          </span>
                          <span className={`text-xl font-black mt-0.5 ${isSelected ? 'text-[#960c0c]' : 'text-slate-800'}`}>
                            {cell.dayNumber}
                          </span>
                          {statusBadge}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 15-Minute Operational Slots Details for Single Doctor */}
                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-black text-slate-800 tracking-tight">
                        Doctor Time Slots Schedule ({docSlots.length})
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-medium">
                        View and manage 15-minute time slots for Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} on {formatDDMMYYYY(selectedDate)}. Click any open slot to toggle availability.
                      </p>
                    </div>

                    {/* Quick Summary Metrics Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-extrabold">
                        {availableCount} Available
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-extrabold">
                        {bookedCount} Booked
                      </span>
                      {passedCount > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-extrabold">
                          {passedCount} Passed
                        </span>
                      )}
                      {disabledCount > 0 && (
                        <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-xs font-extrabold">
                          {disabledCount} Disabled
                        </span>
                      )}
                    </div>
                  </div>

                  {isLoading ? (
                    <p className="text-xs text-slate-400 animate-pulse py-4">Loading operational slot details...</p>
                  ) : docSlots.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200/80 rounded-2xl p-6 text-center space-y-1.5">
                      <p className="text-xs font-black text-slate-700">No Time Slots Configured for This Date</p>
                      <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
                        Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} has no active master slots assigned for this date. You can assign slot schedules under <span className="font-bold text-slate-600">All Doctors</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {docSlots.map((slot) => {
                        const hasPassed = isSlotTimePassed(selectedDate, slot.end_time);
                        let statusLabel = 'Available';
                        let statusStyle = 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-3xs cursor-pointer hover:bg-emerald-100/80';
                        let badgeStyle = 'bg-emerald-600 text-white font-extrabold shadow-2xs';
                        let iconColor = 'text-emerald-600';

                        if (slot.is_booked) {
                          statusLabel = 'Booked';
                          statusStyle = 'bg-indigo-50/70 border-indigo-200 text-indigo-900 shadow-3xs cursor-not-allowed';
                          badgeStyle = 'bg-indigo-600 text-white font-extrabold shadow-2xs';
                          iconColor = 'text-indigo-600';
                        } else if (hasPassed) {
                          statusLabel = 'Passed';
                          statusStyle = 'bg-slate-100/40 border-dashed border-slate-200 text-slate-400 opacity-55 cursor-not-allowed';
                          badgeStyle = 'bg-slate-200/70 text-slate-500 font-extrabold';
                          iconColor = 'text-slate-300';
                        } else if (slot.is_manually_disabled) {
                          statusLabel = 'Disabled';
                          statusStyle = 'bg-rose-50/60 border-rose-200 text-rose-900 shadow-3xs cursor-pointer hover:bg-rose-100/80';
                          badgeStyle = 'bg-rose-600 text-white font-extrabold shadow-2xs';
                          iconColor = 'text-rose-600';
                        }

                        return (
                          <div
                            key={slot.id}
                            onClick={() => {
                              if (slot.is_booked) {
                                info('This slot has an active patient booking and cannot be disabled.');
                                return;
                              }
                              if (hasPassed) {
                                return;
                              }
                              handleToggleSlot(selectedDocId, slot, !slot.is_manually_disabled);
                            }}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all duration-150 select-none ${statusStyle}`}
                          >
                            <div className="flex items-center gap-2">
                              <FiClock className={`text-xs ${iconColor}`} />
                              <span className="text-xs font-bold tracking-tight">
                                {formatSlotRange(slot.start_time, slot.end_time)}
                              </span>
                            </div>

                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${badgeStyle}`}>
                              {statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* VIEW 2: All Doctors Overview & Selection Grid (Full Width) */
        <div className="space-y-8 animate-fade-in">
          {/* Department Selector Panel */}
          <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] max-w-2xl">
            <label className="text-[12px] font-bold text-slate-400 mb-2 capitalize tracking-wider flex items-center gap-1.5">
              Select Hospital Department
            </label>
            <select
              className="w-full border border-slate-200 bg-slate-50/70 rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 shadow-xs"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
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

          {/* Doctors Cards Grid (Full Width) */}
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Doctors in Department ({filteredDoctors.length})
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Select a doctor card below to view and manage 15-minute slot schedules.
              </p>
            </div>

            {filteredDoctors.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#960c0c] flex items-center justify-center mx-auto text-2xl font-bold border border-rose-100">
                  <FiUser />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-800">No Doctors Registered</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                    There are currently no doctors present under this department. Please select another department.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDoctors.map((doc) => {
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="bg-white rounded-3xl border border-slate-200/70 p-6 space-y-5 shadow-xs hover:border-[#960c0c]/50 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 group-hover:text-[#960c0c] transition-colors duration-200">
                            Dr. {doc.name.replace(/^Dr\.\s+/i, '')}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{doc.designation}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="w-full bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-extrabold py-3 px-4 rounded-2xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs mt-2"
                      >
                        Manage Doctor Slots →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailability;
