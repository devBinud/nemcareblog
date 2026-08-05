import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FiClock, FiChevronLeft, FiChevronRight, FiChevronDown, FiCalendar, FiSearch, FiEdit2, FiX } from 'react-icons/fi';
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

const expandTo15MinSlots = (slotList) => {
  if (!Array.isArray(slotList)) return [];
  const expanded = [];
  slotList.forEach(slot => {
    if (!slot.start_time || !slot.end_time) return;
    const [h1, m1] = slot.start_time.split(':').map(Number);
    const [h2, m2] = slot.end_time.split(':').map(Number);
    const startMins = h1 * 60 + m1;
    const endMins = h2 * 60 + m2;
    const duration = endMins - startMins;

    if (duration > 15) {
      let curr = startMins;
      while (curr < endMins) {
        const next = Math.min(curr + 15, endMins);
        const startH = String(Math.floor(curr / 60)).padStart(2, '0');
        const startM = String(curr % 60).padStart(2, '0');
        const endH = String(Math.floor(next / 60)).padStart(2, '0');
        const endM = String(next % 60).padStart(2, '0');

        const slabStart = `${startH}:${startM}:00`;
        const slabEnd = `${endH}:${endM}:00`;

        const isManuallyDisabled = slot.disabled_slabs
          ? slot.disabled_slabs.includes(slabStart)
          : slot.is_manually_disabled;

        expanded.push({
          ...slot,
          id: `${slot.id || slot.master_slot_id}_${startH}${startM}`,
          master_slot_id: slot.master_slot_id || slot.id,
          start_time: slabStart,
          end_time: slabEnd,
          is_manually_disabled: !!isManuallyDisabled,
          available: !isManuallyDisabled && !slot.is_booked
        });
        curr = next;
      }
    } else {
      expanded.push({
        ...slot,
        master_slot_id: slot.master_slot_id || slot.id
      });
    }
  });
  return expanded;
};

const DoctorAvailability = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, success, info, error } = useToast();

  // Selection state
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(doctorId ? String(doctorId) : '');

  // Keep selectedDocId synchronized with route param doctorId
  useEffect(() => {
    if (doctorId) {
      setSelectedDocId(String(doctorId));
    } else {
      setSelectedDocId('');
    }
  }, [doctorId]);
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
  const [absenceMode, setAbsenceMode] = useState('schedule'); // 'schedule' or 'daywise'
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [expandedSlotIds, setExpandedSlotIds] = useState({});
  const [selectedMultiDates, setSelectedMultiDates] = useState([]); // Multi-selected dates for batch operations
  const [explicitWorkingDates, setExplicitWorkingDates] = useState([]); // Extra dates marked working via Month Calendar
  const [explicitOffDutyDates, setExplicitOffDutyDates] = useState([]); // Extra dates marked off-duty via Month Calendar

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

      const rangeDates = [];
      let cur = new Date(startStr);
      const endDateObj = new Date(endStr);
      while (cur <= endDateObj) {
        rangeDates.push(formatDateString(cur));
        cur.setDate(cur.getDate() + 1);
      }
      setExplicitWorkingDates(prev => Array.from(new Set([...prev, ...rangeDates])));
      setExplicitOffDutyDates(prev => prev.filter(d => !rangeDates.includes(d)));

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

  // Sync department selection when doctor is selected directly via URL
  useEffect(() => {
    if (selectedDocId && doctors.length > 0) {
      const currentDoc = doctors.find(d => Number(d.id) === Number(selectedDocId));
      if (currentDoc && currentDoc.department_id) {
        setSelectedDeptId(String(currentDoc.department_id));
      }
    }
  }, [selectedDocId, doctors]);

  // Filter doctors based on selected department
  const filteredDoctors = useMemo(() => {
    return selectedDeptId
      ? doctors.filter(doc => doc.department_id === Number(selectedDeptId))
      : doctors;
  }, [doctors, selectedDeptId]);

  const [docSearchTerm, setDocSearchTerm] = useState('');

  const searchedDoctors = useMemo(() => {
    if (!docSearchTerm.trim()) return filteredDoctors;
    const term = docSearchTerm.toLowerCase();
    return filteredDoctors.filter(
      (doc) =>
        doc.name.toLowerCase().includes(term) ||
        (doc.designation && doc.designation.toLowerCase().includes(term))
    );
  }, [filteredDoctors, docSearchTerm]);

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

  // Reusable DatePicker that displays format as DD-MM-YYYY and opens native calendar picker on click
  const DatePickerDDMMYYYY = ({ value, onChange, min, className }) => {
    const dateInputRef = useRef(null);
    const formattedDisplay = formatDDMMYYYY(value);
    const cleanVal = cleanDateStr(value);

    const triggerPicker = () => {
      if (dateInputRef.current) {
        try {
          if (typeof dateInputRef.current.showPicker === 'function') {
            dateInputRef.current.showPicker();
          } else {
            dateInputRef.current.focus();
            dateInputRef.current.click();
          }
        } catch (e) {
          // Fallback if showPicker is blocked by browser security
        }
      }
    };

    return (
      <div
        onClick={triggerPicker}
        className="relative flex items-center justify-center gap-2 cursor-pointer w-full group select-none"
      >
        <FiCalendar className="text-slate-400 group-hover:text-[#960c0c] text-xs shrink-0 transition-colors" />
        <span className={`${className} font-black text-slate-800 text-xs cursor-pointer`}>
          {formattedDisplay || 'Select Date'}
        </span>
        <input
          ref={dateInputRef}
          type="date"
          value={cleanVal}
          min={min ? cleanDateStr(min) : undefined}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              if (typeof e.target.showPicker === 'function') {
                e.target.showPicker();
              }
            } catch (err) { }
          }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
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
        // Default to today and 7 days ahead
        const today = new Date();
        const sStr = formatDateString(today);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const eStr = formatDateString(nextWeek);
        setSidebarStart(sStr);
        setSidebarEnd(eStr);
      }
    }
  }, [selectedDocId, doctors, currentMonth, formatDateString, cleanDateStr]);

  // Only sync selectedDate when sidebarStart or sidebarEnd actually change
  const prevRangeRef = useRef({ start: '', end: '' });
  useEffect(() => {
    const todayStr = getTodayDateString();
    if (sidebarStart && sidebarEnd) {
      const cleanStart = cleanDateStr(sidebarStart);
      const cleanEnd = cleanDateStr(sidebarEnd);
      if (cleanStart && cleanEnd) {
        if (prevRangeRef.current.start !== cleanStart || prevRangeRef.current.end !== cleanEnd) {
          prevRangeRef.current = { start: cleanStart, end: cleanEnd };
          // Default to today if cleanStart is in the past
          setSelectedDate(cleanStart < todayStr ? todayStr : cleanStart);
        }
      }
    } else {
      setSelectedDate(todayStr);
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
          const responseData = json.data || json;
          const isPublished = responseData.published !== false;
          const isExplicitWorking = explicitWorkingDates.includes(selectedDate);
          const isExplicitOff = explicitOffDutyDates.includes(selectedDate);
          const isDateActive = !isExplicitOff && (isExplicitWorking || isPublished);

          let slots = responseData.slots || [];
          if (slots.length === 0 && masterSlotsList.length > 0) {
            slots = masterSlotsList.map(ms => ({
              id: ms.id,
              master_slot_id: ms.id,
              start_time: ms.start_time,
              end_time: ms.end_time,
              is_booked: false,
              is_manually_disabled: !isDateActive,
              available: isDateActive
            }));
          } else if (!isDateActive) {
            slots = slots.map(s => ({
              ...s,
              is_manually_disabled: true,
              available: false
            }));
          }
          newSlotsMap[doc.id] = slots;
        } else {
          console.warn(`Failed to fetch slots for Dr. ${doc.name.replace(/^Dr\.\s+/i, '')}`);
        }
      } catch (err) {
        console.warn(`Network error loading slots for Dr. ${doc.name.replace(/^Dr\.\s+/i, '')}`, err);
      } finally {
        setLoadingSlotsMap(prev => ({ ...prev, [doc.id]: false }));
      }
    }));

    setSlotsByDoc(newSlotsMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDocId, doctors, filteredDoctors]);

  // Single doctor month slots map for rendering live status badges on calendar date cards
  const [docMonthSlotsMap, setDocMonthSlotsMap] = useState({});
  const [loadingMonthSlots, setLoadingMonthSlots] = useState(false);

  // Fetch slot summaries for all active dates in current month when single doctor is selected
  const fetchDocMonthSlots = useCallback(async (overrideWorking, overrideOff) => {
    if (!selectedDocId || filteredCells.length === 0) return;
    setLoadingMonthSlots(true);
    const newMap = {};
    const currentWorking = overrideWorking || explicitWorkingDates;
    const currentOff = overrideOff || explicitOffDutyDates;

    await Promise.all(filteredCells.map(async (cell) => {
      const dStr = formatDateString(cell.date);
      const isExplicitWorking = currentWorking.includes(dStr);
      const isExplicitOff = currentOff.includes(dStr);

      try {
        const res = await apiFetch(`/doctors/${selectedDocId}/slots?date=${dStr}`);
        if (res.ok) {
          const json = await res.json();
          const responseData = json.data || json;
          const isPublished = isExplicitOff ? false : (responseData.published !== false);
          let slots = responseData.slots || [];

          const isDateActive = !isExplicitOff && (isExplicitWorking || isPublished);
          const booked = slots.filter(s => s.is_booked).length;
          const hasExplicitDisabled = slots.some(s => s.is_manually_disabled);

          const isLeave = !isDateActive || (hasExplicitDisabled && slots.length > 0 && slots.every(s => s.is_booked || s.is_manually_disabled));
          const isAvailable = isDateActive && (slots.length === 0 || slots.some(s => !s.is_booked && !s.is_manually_disabled));

          newMap[dStr] = { published: isPublished, booked, isLeave, isAvailable, total: slots.length || 1 };
        }
      } catch (err) {
        console.error(err);
      }
    }));

    // Auto-sync explicitWorkingDates with all currently published/available dates from API response
    const apiAvailable = Object.keys(newMap).filter(d => newMap[d].isAvailable || (newMap[d].published && !newMap[d].isLeave));
    if (apiAvailable.length > 0) {
      setExplicitWorkingDates(prev => Array.from(new Set([...prev, ...apiAvailable])));
    }

    setDocMonthSlotsMap(newMap);
    setLoadingMonthSlots(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocId, filteredCells, formatDateString]);

  // Direct Active Working & Leave Dates Breakdown for Current Month
  const activeScheduleDetails = useMemo(() => {
    const working = [];
    const onLeave = [];

    filteredCells.forEach(cell => {
      const dStr = formatDateString(cell.date);
      const isExplicitWorking = explicitWorkingDates.includes(dStr);
      const isExplicitOff = explicitOffDutyDates.includes(dStr);
      const dateInfo = docMonthSlotsMap[dStr];

      const formatted = formatDDMMYYYY(dStr);

      if (isExplicitOff || (dateInfo && (dateInfo.isLeave || (!dateInfo.isAvailable && dateInfo.booked === 0)))) {
        onLeave.push(formatted);
      } else if (isExplicitWorking || (dateInfo && (dateInfo.isAvailable || dateInfo.booked > 0))) {
        working.push(formatted);
      }
    });

    return { working, onLeave };
  }, [filteredCells, docMonthSlotsMap, explicitWorkingDates, explicitOffDutyDates, formatDateString, formatDDMMYYYY]);

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
        const responseData = json.data || json;
        let slots = responseData.slots || [];

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
              is_manually_disabled: responseData.published === false,
              available: responseData.published !== false
            }));
          }
        }

        setSlotsByDoc(prev => ({
          ...prev,
          [docId]: expandTo15MinSlots(slots)
        }));
      } else {
        console.warn(`Failed to fetch slots for doctor ${docId} on ${targetDate}`);
      }
    } catch (err) {
      console.warn(`Network error loading doctor slots for ${docId}`, err);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDocId && selectedDate) {
      fetchSingleDoctorSlots(selectedDocId, selectedDate);
    }
  }, [selectedDocId, selectedDate, fetchSingleDoctorSlots]);


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

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* SCHEDULE EDIT MODAL POPUP — top-level so fixed positioning works */}
      {showScheduleModal && (() => {
        const currentDoc = doctors.find(d => d.id === Number(selectedDocId));
        return (
          <div
            className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowScheduleModal(false)}
          >
            <div
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 md:p-8 space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Edit Working Schedule — Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Select preset weeks or set custom date boundaries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              {/* Quick Week Presets */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider block">
                  Quick Week Presets
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 30].map((pVal) => {
                    let label = `Week ${pVal}`;
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

                    const activeDaysCount = activeScheduleDetails.working.filter(wDateStr => {
                      const parts = wDateStr.split('-');
                      if (parts.length === 3) {
                        const formattedYMD = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        return formattedYMD >= sStr && formattedYMD <= eStr;
                      }
                      return false;
                    }).length;

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
                        className={`px-3 py-2 text-xs font-extrabold rounded-xl border transition cursor-pointer flex items-center gap-2 ${isActivePreset
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                      >
                        <span>{label}</span>
                        {activeDaysCount > 0 ? (
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${isActivePreset
                            ? 'bg-emerald-800/90 text-white border-emerald-600/60'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                            {activeDaysCount} Open
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-slate-200/80 text-slate-500 border border-slate-300/40">
                            Off Duty
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">
                    Available From
                  </label>
                  <DatePickerDDMMYYYY
                    value={sidebarStart}
                    onChange={(val) => setSidebarStart(val)}
                    min={getTodayDateString()}
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">
                    Available Until
                  </label>
                  <DatePickerDDMMYYYY
                    value={sidebarEnd}
                    onChange={(val) => setSidebarEnd(val)}
                    min={sidebarStart || getTodayDateString()}
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingSidebar}
                  onClick={async () => {
                    await handleApplyWorkingWeek(selectedDocId, sidebarStart, sidebarEnd);
                    setShowScheduleModal(false);
                  }}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl transition cursor-pointer shadow-xs"
                >
                  {submittingSidebar ? 'Saving...' : 'Apply Working Schedule'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
              onClick={() => navigate('/availability')}
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
            const bookedCount = docSlots.filter(s => s.is_booked).length;
            const availableCount = docSlots.filter(s => !s.is_booked && !s.is_manually_disabled && !isSlotTimePassed(selectedDate, s.end_time)).length;

            return (
              <div className="space-y-8">
                {/* 2. Embedded Doctor Availability & Schedule Range Manager */}

                <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-200">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiClock className="text-[#960c0c]" /> Schedule & Leave Manager - Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''}
                      </h3>
                    </div>

                    {/* Mode Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100/70 rounded-xl border border-slate-200/50 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('schedule')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${absenceMode === 'schedule'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Active Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbsenceMode('daywise')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${absenceMode === 'daywise'
                          ? 'bg-white text-[#960c0c] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        Monthly Calendar
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Active Working Schedule Window */}
                  {absenceMode === 'schedule' && (
                    <div className="space-y-4">
                      {/* Active Working Schedule Summary Banner */}
                      {(() => {
                        const monthName = currentMonth.toLocaleString('default', { month: 'long' });
                        const workingDays = activeScheduleDetails.working
                          .map(dStr => parseInt(dStr.split('-')[0], 10))
                          .filter((v, i, a) => !isNaN(v) && a.indexOf(v) === i)
                          .sort((a, b) => a - b);

                        return (
                          <div className="bg-emerald-50/90 border border-emerald-200/80 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-xs font-black text-emerald-950">
                                  Available Working Schedule: {monthName} - {workingDays.length > 0 ? workingDays.join(', ') : 'None'}
                                </p>
                                <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
                                  Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} is open for patient appointments on these dates.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                              <div className="flex items-baseline gap-1.5 px-1">
                                <span className="text-3xl font-black text-emerald-950 leading-none">{workingDays.length}</span>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Days Open</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowScheduleModal(true)}
                                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <FiEdit2 className="text-xs" />
                                <span>Edit Schedule</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}




                  {/* TAB 4: Daywise Availability Calendar (Full Month & Multi-Select) */}
                  {absenceMode === 'daywise' && (
                    <div className="space-y-6">
                      {/* Active Schedule Range Summary Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            Monthly Availability Overview
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
                                  await Promise.all(selectedMultiDates.map(async (dStr) => {
                                    await apiFetch(`/doctors/${selectedDocId}/unavailable`, {
                                      method: 'POST',
                                      body: JSON.stringify({ date: dStr })
                                    });
                                    try {
                                      const sRes = await apiFetch(`/doctors/${selectedDocId}/slots?date=${dStr}`);
                                      if (sRes.ok) {
                                        const sJson = await sRes.json();
                                        const sData = sJson.data || sJson;
                                        const sList = sData.slots || [];
                                        const activeList = sList.filter(s => !s.is_manually_disabled && !s.is_booked);
                                        if (activeList.length > 0) {
                                          await Promise.all(activeList.map(s =>
                                            apiFetch(`/doctors/${selectedDocId}/slots/toggle`, {
                                              method: 'POST',
                                              body: JSON.stringify({
                                                slot_id: s.master_slot_id || s.id,
                                                slab_start_time: s.start_time,
                                                date: dStr,
                                                is_disabled: true
                                              })
                                            })
                                          ));
                                        }
                                      }
                                    } catch (e) {
                                      console.warn('Slot toggle error during batch off-duty', e);
                                    }
                                  }));

                                  const updatedOff = Array.from(new Set([...explicitOffDutyDates, ...selectedMultiDates]));
                                  const updatedWorking = explicitWorkingDates.filter(d => !selectedMultiDates.includes(d));

                                  setExplicitOffDutyDates(updatedOff);
                                  setExplicitWorkingDates(updatedWorking);
                                  success(`Marked off-duty for ${selectedMultiDates.length} selected date(s)!`);
                                  setSelectedMultiDates([]);
                                  fetchDocMonthSlots(updatedWorking, updatedOff);
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
                                  await Promise.all(selectedMultiDates.map(async (dStr) => {
                                    await apiFetch(`/doctors/${selectedDocId}/available`, {
                                      method: 'POST',
                                      body: JSON.stringify({ date: dStr })
                                    });
                                    try {
                                      const sRes = await apiFetch(`/doctors/${selectedDocId}/slots?date=${dStr}`);
                                      if (sRes.ok) {
                                        const sJson = await sRes.json();
                                        const sData = sJson.data || sJson;
                                        const sList = sData.slots || [];
                                        const disabledList = sList.filter(s => s.is_manually_disabled);
                                        if (disabledList.length > 0) {
                                          await Promise.all(disabledList.map(s =>
                                            apiFetch(`/doctors/${selectedDocId}/slots/toggle`, {
                                              method: 'POST',
                                              body: JSON.stringify({
                                                slot_id: s.master_slot_id || s.id,
                                                slab_start_time: s.start_time,
                                                date: dStr,
                                                is_disabled: false
                                              })
                                            })
                                          ));
                                        }
                                      }
                                    } catch (e) {
                                      console.warn('Slot toggle error during batch working', e);
                                    }
                                  }));

                                  const currentlyAvailable = Object.keys(docMonthSlotsMap).filter(d => docMonthSlotsMap[d]?.isAvailable || (docMonthSlotsMap[d]?.published && !docMonthSlotsMap[d]?.isLeave));
                                  const updatedWorking = Array.from(new Set([...currentlyAvailable, ...explicitWorkingDates, ...selectedMultiDates]));
                                  const updatedOff = explicitOffDutyDates.filter(d => !selectedMultiDates.includes(d));

                                  setExplicitWorkingDates(updatedWorking);
                                  setExplicitOffDutyDates(updatedOff);

                                  success(`Marked available for ${selectedMultiDates.length} selected date(s)!`);
                                  setSelectedMultiDates([]);
                                  fetchDoctors();
                                  fetchDocMonthSlots(updatedWorking, updatedOff);
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

                          const dateInfo = docMonthSlotsMap[dateStr];
                          const isExplicitWorking = explicitWorkingDates.includes(dateStr);
                          const isExplicitOffDuty = explicitOffDutyDates.includes(dateStr);
                          const isDayAvailable = !isExplicitOffDuty && (isExplicitWorking || (dateInfo?.isAvailable && dateInfo?.total > 0) || (dateInfo?.published && !dateInfo?.isLeave));

                          let statusBadge = null;
                          if (loadingMonthSlots && !dateInfo) {
                            statusBadge = <span className="text-[8px] font-bold text-slate-400 animate-pulse mt-1">Loading...</span>;
                          } else if (dateInfo) {
                            if (isExplicitOffDuty || (dateInfo.isLeave && !isExplicitWorking)) {
                              statusBadge = <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200 mt-1">Off Duty</span>;
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
                              className={`relative overflow-hidden border rounded-2xl p-3 flex flex-col items-center justify-center min-h-[95px] select-none transition-all duration-150 cursor-pointer ${isMultiSelected
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
                        View 15-minute time slot status for Dr. {currentDoc?.name ? currentDoc.name.replace(/^Dr\.\s+/i, '') : ''} on {formatDDMMYYYY(selectedDate)}.
                      </p>
                    </div>

                    {/* Date Selector & Action Buttons Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-extrabold">
                          {availableCount} Available
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-extrabold">
                          {bookedCount} Booked
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/availability/${selectedDocId}/slots`)}
                        className="px-4 py-2 bg-[#960c0c] hover:bg-[#b00f0f] text-white text-xs font-extrabold rounded-2xl transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FiEdit2 className="text-xs" />
                        <span>Edit / Manage Slots</span>
                      </button>

                      <div className="bg-white hover:bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#960c0c]/40 transition duration-200 cursor-pointer flex items-center justify-center">
                        <DatePickerDDMMYYYY
                          value={selectedDate}
                          onChange={(val) => setSelectedDate(val)}
                          className="border-0 bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                        />
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
                  ) : (() => {
                    // Group 15-minute slabs into hourly master slots for expandable accordion view
                    const groupsMap = {};
                    docSlots.forEach((slot) => {
                      const mid = slot.master_slot_id || 'default';
                      if (!groupsMap[mid]) {
                        groupsMap[mid] = { master_slot_id: mid, slabs: [] };
                      }
                      groupsMap[mid].slabs.push(slot);
                    });

                    const masterGroups = Object.values(groupsMap).map((group) => {
                      group.slabs.sort((a, b) => a.start_time.localeCompare(b.start_time));
                      const firstSlab = group.slabs[0];
                      const lastSlab = group.slabs[group.slabs.length - 1];

                      const activeSlabsCount = group.slabs.filter(s => !s.is_booked && !s.is_manually_disabled && !isSlotTimePassed(selectedDate, s.end_time)).length;
                      const bookedCount = group.slabs.filter(s => s.is_booked).length;
                      const allPassed = group.slabs.every(s => isSlotTimePassed(selectedDate, s.end_time));
                      const allInactive = group.slabs.every(s => s.is_manually_disabled || isSlotTimePassed(selectedDate, s.end_time));

                      return {
                        ...group,
                        master_start_time: firstSlab ? firstSlab.start_time : '',
                        master_end_time: lastSlab ? lastSlab.end_time : '',
                        activeSlabsCount,
                        bookedCount,
                        allPassed,
                        allInactive
                      };
                    }).sort((a, b) => a.master_start_time.localeCompare(b.master_start_time));

                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 items-start">
                          {masterGroups.map((group) => {
                            const masterId = group.master_slot_id;
                            const isExpanded = !!expandedSlotIds[masterId];

                            let masterStatusLabel = 'Inactive';
                            let masterBadgeStyle = 'bg-slate-400 text-white font-extrabold shadow-2xs';
                            let masterCardStyle = 'bg-slate-50/80 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50';
                            let iconColor = 'text-slate-400';

                            if (group.allPassed) {
                              masterStatusLabel = 'Passed';
                              masterCardStyle = 'bg-slate-100/40 border-dashed border-slate-200 text-slate-400 opacity-60';
                              masterBadgeStyle = 'bg-slate-200 text-slate-500 font-extrabold';
                              iconColor = 'text-slate-300';
                            } else if (group.activeSlabsCount > 0) {
                              masterStatusLabel = `${group.activeSlabsCount} Active`;
                              masterCardStyle = 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950 hover:border-emerald-400 hover:shadow-xs';
                              masterBadgeStyle = 'bg-emerald-700 text-white font-extrabold shadow-2xs';
                              iconColor = 'text-emerald-700';
                            } else if (group.bookedCount > 0) {
                              masterStatusLabel = `${group.bookedCount} Booked`;
                              masterCardStyle = 'bg-indigo-50/70 border-indigo-200/90 text-indigo-950 hover:border-indigo-400 hover:shadow-xs';
                              masterBadgeStyle = 'bg-indigo-600 text-white font-extrabold shadow-2xs';
                              iconColor = 'text-indigo-600';
                            }

                            return (
                              <div
                                key={masterId}
                                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-3xs ${masterCardStyle}`}
                              >
                                {/* Hourly Master Header Bar with Chevron */}
                                <div
                                  onClick={() => setExpandedSlotIds(prev => ({ ...prev, [masterId]: !prev[masterId] }))}
                                  className="p-3.5 flex items-center justify-between cursor-pointer select-none group gap-2"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <FiClock className={`text-xs shrink-0 ${iconColor}`} />
                                    <span className="text-xs font-black tracking-tight whitespace-nowrap text-slate-800">
                                      {formatSlotRange(group.master_start_time, group.master_end_time)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider whitespace-nowrap ${masterBadgeStyle}`}>
                                      {masterStatusLabel}
                                    </span>

                                    {/* Chevron Dropdown Arrow Indicator */}
                                    <div className="p-1 rounded-lg text-slate-400 group-hover:text-slate-700 transition shrink-0">
                                      <FiChevronDown className={`text-sm transition-transform duration-300 ${isExpanded ? 'transform rotate-180 text-slate-800' : ''}`} />
                                    </div>
                                  </div>
                                </div>

                                {/* Expanded Accordion Content: 15-Minute Slabs */}
                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-white/80 space-y-2 animate-fade-in">
                                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
                                      15-Minute Slots ({group.slabs.length})
                                    </p>
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {group.slabs.map((slot) => {
                                        const hasPassed = isSlotTimePassed(selectedDate, slot.end_time);
                                        let slabLabel = 'Active';
                                        let slabBadge = 'bg-emerald-600 text-white hover:bg-emerald-700';
                                        let slabBg = 'bg-emerald-50/70 border-emerald-200 text-emerald-900';

                                        if (slot.is_booked) {
                                          slabLabel = 'Booked 🔒';
                                          slabBadge = 'bg-indigo-600 text-white';
                                          slabBg = 'bg-indigo-50/70 border-indigo-200 text-indigo-900';
                                        } else if (hasPassed) {
                                          slabLabel = 'Passed';
                                          slabBadge = 'bg-slate-200 text-slate-500';
                                          slabBg = 'bg-slate-100/40 border-slate-200 text-slate-400 opacity-60';
                                        } else if (slot.is_manually_disabled) {
                                          slabLabel = 'Inactive';
                                          slabBadge = 'bg-slate-500 text-white hover:bg-slate-600';
                                          slabBg = 'bg-slate-100/80 border-slate-200 text-slate-600';
                                        }

                                        return (
                                          <div
                                            key={slot.id}
                                            className={`p-2 rounded-xl border flex items-center justify-between text-xs select-none transition ${slabBg}`}
                                          >
                                            <span className="text-[11px] font-bold">
                                              {formatSlotRange(slot.start_time, slot.end_time)}
                                            </span>

                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${slabBadge}`}>
                                              {slabLabel}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* VIEW 2: All Doctors Overview & Selection Grid (Full Width) */
        <div className="space-y-8 animate-fade-in">
          {/* Department Selector Panel */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
            <label className="text-[10px] font-extrabold text-slate-400 mb-2 uppercase tracking-wider block">
              Select Hospital Department
            </label>
            <div className="relative max-w-md">
              <select
                className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-5 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 shadow-2xs appearance-none cursor-pointer pr-10"
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
              <FiChevronDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none text-sm" />
            </div>
          </div>

          {/* Active Doctors Table Container (Matches Departments Table UI) */}
          <div className="bg-white rounded-3xl border border-slate-100/20 p-5 md:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                Active Doctors ({searchedDoctors.length})
              </h3>

              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search doctor..."
                  value={docSearchTerm}
                  onChange={(e) => setDocSearchTerm(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                />
              </div>
            </div>

            {loadingDepts ? (
              <p className="text-xs text-slate-400 animate-pulse py-4">Loading doctors...</p>
            ) : searchedDoctors.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No doctors found under this department.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                      <th className="py-3 px-4 text-center w-14 border-r border-slate-200">SL No.</th>
                      <th className="py-3 px-4 pl-5">Doctor Name</th>
                      <th className="py-3 px-4 border-l border-slate-200">Designation</th>
                      <th className="py-3 px-4 text-center w-48 border-l border-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedDoctors.map((doc, idx) => {
                      return (
                        <tr
                          key={doc.id}
                          className="hover:bg-slate-50/40 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium cursor-pointer"
                          onClick={() => navigate(`/availability/${doc.id}`)}
                        >
                          <td className="py-3.5 px-4 text-center border-r border-slate-200 font-bold text-slate-550">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 pl-5 font-bold text-slate-800 hover:text-[#960c0c] transition-colors">
                            Dr. {doc.name.replace(/^Dr\.\s+/i, '')}
                          </td>
                          <td className="py-3 px-4 border-l border-slate-200 font-semibold text-slate-600">
                            {doc.designation || 'Consultant'}
                          </td>
                          <td className="py-3 px-4 border-l border-slate-200 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/availability/${doc.id}`);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold px-3.5 py-1.5 rounded-xl transition duration-200 inline-flex items-center gap-1 cursor-pointer shadow-xs shadow-blue-600/20"
                            >
                              Manage Slots
                            </button>
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
      )}
    </div>
  );
};

export default DoctorAvailability;
