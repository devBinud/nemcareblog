import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  const [absenceMode, setAbsenceMode] = useState('schedule'); // 'schedule', 'leave', 'weekly', or 'daywise'
  const [selectedWeekdays, setSelectedWeekdays] = useState([]); // [1..6] (1=Mon, 6=Sat)
  const [selectedMultiDates, setSelectedMultiDates] = useState([]); // Multi-selected dates for batch operations
  const [explicitWorkingDates, setExplicitWorkingDates] = useState([]); // Extra dates marked working via Month Calendar


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

  // Set active week/schedule range & automatically mark rest dates off-duty
  const handleApplyWorkingWeek = async (docId, startStr, endStr) => {
    if (!docId || !startStr || !endStr) {
      info('Please select start and end dates.');
      return;
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end < start) {
      info('End date cannot be before start date.');
      return;
    }
    setSubmittingSidebar(true);

    try {
      await apiFetch(`/doctors/${docId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({
          start_date: startStr,
          end_date: endStr,
          available_from: startStr,
          available_to: endStr
        })
      });

      success(`Active Working Schedule set (${formatDDMMYYYY(startStr)} - ${formatDDMMYYYY(endStr)})!`);
      setSidebarStart(startStr);
      setSidebarEnd(endStr);
      const todayStr = getTodayDateString();
      const focusDate = (startStr <= todayStr && endStr >= todayStr) ? todayStr : (startStr < todayStr ? todayStr : startStr);
      setSelectedDate(focusDate);
      fetchDoctors();
      fetchDocMonthSlots();
      fetchAllActiveSlots();
      fetchSingleDoctorSlots(docId, focusDate);

    } catch (err) {
      console.error(err);
      error('Failed to set working schedule.');
    } finally {
      setSubmittingSidebar(false);
    }
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

  const cleanDateStr = useCallback((val) => {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes('T')) {
      return str.split('T')[0];
    }
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const ddStr = parts[2].substring(0, 2).padStart(2, '0');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${ddStr}`;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return str;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const formatDateString = useCallback((dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const formatDDMMYYYY = useCallback((dateVal) => {
    if (!dateVal) return '';
    const clean = cleanDateStr(dateVal);
    const parts = clean.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return clean;
  }, [cleanDateStr]);

  // Reusable DatePicker that displays format as DD-MM-YYYY
  const DatePickerDDMMYYYY = ({ value, onChange, min, className }) => {
    const formattedDisplay = formatDDMMYYYY(value);
    const cleanVal = cleanDateStr(value);
    return (
      <div className="relative flex items-center w-full">
        <input
          type="text"
          readOnly
          value={formattedDisplay}
          placeholder="DD-MM-YYYY"
          className={`${className} cursor-pointer`}
        />
        <input
          type="date"
          value={cleanVal}
          min={min ? cleanDateStr(min) : undefined}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
        />
      </div>
    );
  };


  // Auto-populate active working schedule range when doctor is selected
  useEffect(() => {
    if (!selectedDocId) {
      setSidebarStart('');
      setSidebarEnd('');
      return;
    }
    const currentDoc = doctors.find(d => d.id === Number(selectedDocId));
    if (currentDoc) {
      if (currentDoc.available_from && currentDoc.available_to) {
        setSidebarStart(cleanDateStr(currentDoc.available_from));
        setSidebarEnd(cleanDateStr(currentDoc.available_to));
      } else if (currentDoc.start_date && currentDoc.end_date) {
        setSidebarStart(cleanDateStr(currentDoc.start_date));
        setSidebarEnd(cleanDateStr(currentDoc.end_date));
      } else {
        // Default to Week 1 of current month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const sStr = formatDateString(new Date(year, month, 1));
        const eStr = formatDateString(new Date(year, month, 7));
        setSidebarStart(sStr);
        setSidebarEnd(eStr);
      }
    }
  }, [selectedDocId, doctors, currentMonth, formatDateString, cleanDateStr]);

  // Only sync selectedDate when sidebarStart or sidebarEnd actually change
  const prevRangeRef = useRef({ start: '', end: '' });
  useEffect(() => {
    if (sidebarStart && sidebarEnd) {
      const cleanStart = cleanDateStr(sidebarStart);
      const cleanEnd = cleanDateStr(sidebarEnd);
      if (cleanStart && cleanEnd) {
        if (prevRangeRef.current.start !== cleanStart || prevRangeRef.current.end !== cleanEnd) {
          prevRangeRef.current = { start: cleanStart, end: cleanEnd };
          setSelectedDate(cleanStart);
        }
      }
    }
  }, [sidebarStart, sidebarEnd, cleanDateStr]);





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
            }));
          }
          const hasExplicitDisabled = json.data?.slots?.some(s => s.is_manually_disabled);
          const booked = slots.filter(s => s.is_booked).length;
          const isLeave = !!hasExplicitDisabled && slots.length > 0 && slots.every(s => s.is_booked || s.is_manually_disabled);
          const isAvailable = slots.length > 0 && slots.some(s => !s.is_booked && !s.is_manually_disabled);
          newMap[dStr] = { booked, isLeave, isAvailable, total: slots.length };



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
  const fetchSingleDoctorSlots = useCallback(async (docId, dateVal) => {
    const targetDate = dateVal || selectedDate;
    if (!docId || !targetDate) return;
    try {
      const res = await apiFetch(`/doctors/${docId}/slots?date=${targetDate}`);
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
  }, [selectedDate, error]);

  useEffect(() => {
    if (selectedDocId && selectedDate) {
      fetchSingleDoctorSlots(selectedDocId, selectedDate);
    }
  }, [selectedDocId, selectedDate, fetchSingleDoctorSlots]);


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
              <span>Back to All Doctors Overview</span>
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
                {/* 2. Embedded Doctor Availability & Schedule Range Manager */}

                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiClock className="text-[#960c0c]" /> Schedule & Leave Manager — Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                      </h3>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/70 rounded-2xl border border-slate-200/50 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('schedule')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${absenceMode === 'schedule'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Active Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('daywise')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${absenceMode === 'daywise'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Month Calendar
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Active Working Schedule Window */}
                  {absenceMode === 'schedule' && (
                    <div className="space-y-4">
                      {/* Active Working Window Summary Banner */}
                      {sidebarStart && sidebarEnd ? (
                        <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                            <div>
                              <p className="text-xs font-black text-emerald-950">
                                Active Working Schedule: {formatDDMMYYYY(sidebarStart)} to {formatDDMMYYYY(sidebarEnd)}
                              </p>
                              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                                Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} is open for patient appointments during this date range.
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-white px-3 py-1 rounded-xl border border-emerald-200 uppercase shrink-0">
                            SCHEDULE ACTIVE
                          </span>
                        </div>
                      ) : (
                        <div className="bg-amber-50/90 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">
                            No Active Working Range Set. Select a week below and click Apply Working Schedule.
                          </span>
                        </div>
                      )}

                      {/* Compact Pill Buttons */}

                      <div className="flex flex-wrap items-center gap-2">
                        {[1, 2, 3, 4, 30].map((pVal) => {
                          let label = `Week ${pVal} (1–7)`;
                          let startD = (pVal - 1) * 7 + 1;
                          let endD = pVal * 7;
                          const year = currentMonth.getFullYear();
                          const month = currentMonth.getMonth();
                          const lastDay = new Date(year, month + 1, 0).getDate();

                          if (pVal === 1) label = 'Week 1 (1–7)';
                          if (pVal === 2) label = 'Week 2 (8–14)';
                          if (pVal === 3) label = 'Week 3 (15–21)';
                          if (pVal === 4) { endD = lastDay; label = `Week 4 (22–${lastDay})`; }
                          if (pVal === 30) { startD = 1; endD = lastDay; label = 'Full Month'; }

                          const sStr = formatDateString(new Date(year, month, startD));
                          const eStr = formatDateString(new Date(year, month, endD));

                          const isActivePreset = sidebarStart === sStr && sidebarEnd === eStr;

                          return (
                            <button
                              key={pVal}
                              type="button"
                              onClick={() => {
                                setSidebarStart(sStr);
                                setSidebarEnd(eStr);
                                const todayStr = getTodayDateString();
                                const focusDate = (sStr <= todayStr && eStr >= todayStr) ? todayStr : (sStr < todayStr ? todayStr : sStr);
                                setSelectedDate(focusDate);
                              }}
                              className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                                isActivePreset
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              <span>{label}</span>
                              {isActivePreset && <span className="text-[10px] font-black">✓</span>}
                            </button>

                          );
                        })}
                      </div>

                      {/* Inline Custom Range Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-3 border-t border-slate-100">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Available From
                          </label>
                          <DatePickerDDMMYYYY
                            value={sidebarStart}
                            onChange={(val) => setSidebarStart(val)}
                            min={getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/60 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider block">
                            Available Until
                          </label>
                          <DatePickerDDMMYYYY
                            value={sidebarEnd}
                            onChange={(val) => setSidebarEnd(val)}
                            min={sidebarStart || getTodayDateString()}
                            className="w-full border border-slate-200 bg-slate-50/60 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={submittingSidebar}
                          onClick={() => handleApplyWorkingWeek(selectedDocId, sidebarStart, sidebarEnd)}
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/50 text-white font-extrabold py-2 px-4 rounded-xl transition text-xs shadow-xs cursor-pointer"
                        >
                          {submittingSidebar ? 'Applying...' : 'Apply Working Schedule'}
                        </button>
                      </div>
                    </div>
                  )}


                  {/* TAB 4: Daywise Availability Calendar (Full Month & Multi-Select) */}
                  {absenceMode === 'daywise' && (
                    <div className="space-y-6">
                      {/* Active Schedule Range Summary Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            Monthly Availability Overview — Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                          </p>


                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Interactive monthly calendar with multi-select dates for batch availability updates.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-2 border border-slate-200 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                          >
                            <FiChevronLeft />
                          </button>
                          <span className="text-xs font-extrabold text-slate-700 min-w-[120px] text-center">
                            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-2 border border-slate-200 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                          >
                            <FiChevronRight />
                          </button>
                        </div>
                      </div>

                      {/* Quick Multi-Select Presets */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-100/60 rounded-2xl border border-slate-200/50">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Quick Multi-Select Presets:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const year = currentMonth.getFullYear();
                              const month = currentMonth.getMonth();
                              const dates = [];
                              for (let d = 1; d <= 7; d++) {
                                dates.push(formatDateString(new Date(year, month, d)));
                              }
                              setSelectedMultiDates(dates);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-[#960c0c] border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                          >
                            Week 1 (1–7)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const year = currentMonth.getFullYear();
                              const month = currentMonth.getMonth();
                              const dates = [];
                              for (let d = 8; d <= 14; d++) {
                                dates.push(formatDateString(new Date(year, month, d)));
                              }
                              setSelectedMultiDates(dates);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-[#960c0c] border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                          >
                            Week 2 (8–14)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const year = currentMonth.getFullYear();
                              const month = currentMonth.getMonth();
                              const dates = [];
                              for (let d = 15; d <= 21; d++) {
                                dates.push(formatDateString(new Date(year, month, d)));
                              }
                              setSelectedMultiDates(dates);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-[#960c0c] border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                          >
                            Week 3 (15–21)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const year = currentMonth.getFullYear();
                              const month = currentMonth.getMonth();
                              const totalDays = new Date(year, month + 1, 0).getDate();
                              const dates = [];
                              for (let d = 22; d <= totalDays; d++) {
                                dates.push(formatDateString(new Date(year, month, d)));
                              }
                              setSelectedMultiDates(dates);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:text-[#960c0c] border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
                          >
                            Week 4 (22–End)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const dates = filteredCells.map(c => formatDateString(c.date));
                              setSelectedMultiDates(dates);
                            }}
                            className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition cursor-pointer"
                          >
                            Select All Active Days
                          </button>
                          {selectedMultiDates.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedMultiDates([])}
                              className="px-3 py-1.5 text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl transition cursor-pointer"
                            >
                              Clear ({selectedMultiDates.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Batch Operations Bar for Multi-Selected Dates */}
                      {selectedMultiDates.length > 0 && (
                        <div className="bg-[#960c0c]/10 border border-[#960c0c]/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                          <div>
                            <p className="text-xs font-black text-[#960c0c]">
                              {selectedMultiDates.length} Date(s) Selected for Multi-Update
                            </p>
                            <p className="text-[11px] text-slate-600 font-medium">
                              Choose an action to apply across all selected dates simultaneously.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={submittingSidebar}
                              onClick={async () => {
                                setSubmittingSidebar(true);
                                try {
                                  await Promise.all(selectedMultiDates.map(dStr =>
                                    apiFetch(`/doctors/${selectedDocId}/unavailable`, {
                                      method: 'POST',
                                      body: JSON.stringify({ date: dStr })
                                    })
                                  ));
                                  setExplicitWorkingDates(prev => prev.filter(d => !selectedMultiDates.includes(d)));
                                  success(`Marked off-duty for ${selectedMultiDates.length} selected date(s)!`);
                                  setSelectedMultiDates([]);
                                  fetchDocMonthSlots();
                                  fetchAllActiveSlots();
                                  if (selectedDocId) fetchSingleDoctorSlots(selectedDocId, selectedDate);
                                } catch (err) {
                                  console.error(err);
                                  error('Failed to update leave for selected dates.');
                                } finally {
                                  setSubmittingSidebar(false);
                                }
                              }}
                              className="bg-[#960c0c] hover:bg-[#c51c1c] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                            >
                              Mark Off-Duty ({selectedMultiDates.length})
                            </button>
                            <button
                              type="button"
                              disabled={submittingSidebar}
                              onClick={async () => {
                                setSubmittingSidebar(true);
                                try {
                                  await Promise.all(selectedMultiDates.map(dStr =>
                                    apiFetch(`/doctors/${selectedDocId}/available`, {
                                      method: 'POST',
                                      body: JSON.stringify({ date: dStr })
                                    })
                                  ));
                                  setExplicitWorkingDates(prev => Array.from(new Set([...prev, ...selectedMultiDates])));
                                  
                                  const sortedDates = [...selectedMultiDates].sort();
                                  if (sortedDates.length > 0) {
                                    const minSel = sortedDates[0];
                                    const maxSel = sortedDates[sortedDates.length - 1];
                                    setSidebarStart(prev => (!prev || minSel < prev ? minSel : prev));
                                    setSidebarEnd(prev => (!prev || maxSel > prev ? maxSel : prev));
                                  }

                                  success(`Marked available for ${selectedMultiDates.length} selected date(s)!`);
                                  setSelectedMultiDates([]);
                                  fetchDoctors();
                                  fetchDocMonthSlots();
                                  fetchAllActiveSlots();
                                  if (selectedDocId) fetchSingleDoctorSlots(selectedDocId, selectedDate);
                                } catch (err) {
                                  console.error(err);
                                  error('Failed to restore availability.');
                                } finally {
                                  setSubmittingSidebar(false);
                                }
                              }}

                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                            >
                              Mark Working ({selectedMultiDates.length})
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Full Month Calendar Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60">
                        {filteredCells.map((cell, idx) => {
                          const dateStr = formatDateString(cell.date);
                          const isMultiSelected = selectedMultiDates.includes(dateStr);
                          let isWithinActiveRange = false;
                          if (sidebarStart && sidebarEnd) {
                            isWithinActiveRange = dateStr >= sidebarStart && dateStr <= sidebarEnd;
                          }

                          const dateInfo = docMonthSlotsMap[dateStr];
                          const isExplicitWorking = explicitWorkingDates.includes(dateStr);
                          const isDayAvailable = (isWithinActiveRange || isExplicitWorking) && !dateInfo?.isLeave;



                          let statusBadge = null;
                          if (loadingMonthSlots && !dateInfo) {
                            statusBadge = <span className="text-[8px] font-bold text-slate-400 animate-pulse mt-1">Loading...</span>;
                          } else if (dateInfo) {
                            if (dateInfo.isLeave) {
                              statusBadge = <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 mt-1">On Leave</span>;
                            } else if (dateInfo.booked > 0) {
                              statusBadge = <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 border border-indigo-200 mt-1">{dateInfo.booked} Booked</span>;
                            } else if (isDayAvailable) {
                              statusBadge = <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 mt-1">Available</span>;
                            }
                          }

                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                if (selectedMultiDates.includes(dateStr)) {
                                  setSelectedMultiDates(prev => prev.filter(d => d !== dateStr));
                                } else {
                                  setSelectedMultiDates(prev => [...prev, dateStr]);
                                }
                                setSelectedDate(dateStr);
                              }}
                              className={`relative overflow-hidden border rounded-2xl p-3 flex flex-col items-center justify-center min-h-[95px] select-none transition-all duration-150 cursor-pointer ${
                                isMultiSelected
                                  ? 'border-[#960c0c] bg-rose-50/60 ring-2 ring-[#960c0c]/40 font-black shadow-xs'
                                  : isDayAvailable
                                  ? 'border-emerald-200 bg-emerald-50/40 text-slate-800'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                              }`}
                            >


                              {isMultiSelected && (
                                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#960c0c] text-white rounded-full flex items-center justify-center text-[9px] font-black">
                                  ✓
                                </span>
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isMultiSelected ? 'text-[#960c0c]' : 'text-slate-400'}`}>
                                {cell.date.toLocaleString('default', { weekday: 'short' })}
                              </span>
                              <span className={`text-xl font-black mt-0.5 ${isMultiSelected ? 'text-[#960c0c]' : 'text-slate-800'}`}>
                                {cell.dayNumber}
                              </span>
                              {statusBadge}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

                    {/* Date Selector & Quick Summary Metrics Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-200/80">
                        <button
                          type="button"
                          title="Previous Day"
                          onClick={() => {
                            const cur = new Date(selectedDate || getTodayDateString());
                            cur.setDate(cur.getDate() - 1);
                            setSelectedDate(formatDateString(cur));
                          }}
                          className="p-1.5 border border-slate-200 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                        >
                          <FiChevronLeft className="text-xs" />
                        </button>

                        <div className="min-w-[130px]">
                          <DatePickerDDMMYYYY
                            value={selectedDate}
                            onChange={(val) => setSelectedDate(val)}
                            className="border-0 bg-transparent px-2 py-1 text-xs font-black text-slate-800 text-center focus:outline-none cursor-pointer"
                          />
                        </div>

                        <button
                          type="button"
                          title="Next Day"
                          onClick={() => {
                            const cur = new Date(selectedDate || getTodayDateString());
                            cur.setDate(cur.getDate() + 1);
                            setSelectedDate(formatDateString(cur));
                          }}
                          className="p-1.5 border border-slate-200 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                        >
                          <FiChevronRight className="text-xs" />
                        </button>
                      </div>


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
