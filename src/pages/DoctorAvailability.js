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

// Helper to sort slots chronologically or format ranges

const DoctorAvailability = () => {
  const { toasts, removeToast, success, info, error } = useToast();

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

  // Sidebar state
  const [sidebarDocId, setSidebarDocId] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarStart, setSidebarStart] = useState('');
  const [sidebarEnd, setSidebarEnd] = useState('');
  const [sidebarStatus, setSidebarStatus] = useState('unavailable');
  const [submittingSidebar, setSubmittingSidebar] = useState(false);

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
    } finally {
      setLoadingDocs(false);
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

  // Filter doctors based on sidebar search query
  const searchedDoctors = useMemo(() => {
    if (!sidebarSearch.trim()) return doctors;
    return doctors.filter(doc => 
      doc.name.toLowerCase().includes(sidebarSearch.toLowerCase()) || 
      doc.designation.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
  }, [doctors, sidebarSearch]);

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

  // Apply availability status over a range of dates from the Quick Availability Sidebar
  const handleApplySidebarRange = async (e) => {
    e.preventDefault();
    if (!sidebarDocId) {
      info('Please select a doctor first.');
      return;
    }
    if (!sidebarStart || !sidebarEnd) {
      info('Please select both start and end dates.');
      return;
    }

    const start = new Date(sidebarStart);
    const end = new Date(sidebarEnd);

    if (end < start) {
      info('End date cannot be before start date.');
      return;
    }

    setSubmittingSidebar(true);

    const dates = [];
    let current = new Date(start);
    while (current <= end) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setDate(current.getDate() + 1);
    }

    const actionText = sidebarStatus === 'unavailable' ? 'unavailable' : 'available';

    try {
      const promises = dates.map(async (dStr) => {
        const endpoint = sidebarStatus === 'unavailable' ? `/doctors/${sidebarDocId}/unavailable` : `/doctors/${sidebarDocId}/available`;
        return apiFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({ date: dStr })
        });
      });

      const results = await Promise.all(promises);
      const failedResponse = results.find(res => !res.ok);

      if (!failedResponse) {
        success(`Doctor successfully marked as ${actionText} from ${sidebarStart} to ${sidebarEnd}!`);
        setSidebarDocId('');
        setSidebarStart('');
        setSidebarEnd('');
        setSidebarSearch('');
      } else {
        const json = await failedResponse.json();
        error(json.message || 'Failed to apply range status updates.');
      }
    } catch (err) {
      console.error(err);
      error('Network error. Failed to apply sidebar range leave.');
    } finally {
      setSubmittingSidebar(false);
      // Refresh slots of all active doctors if selectedDate is within the range
      if (dates.includes(selectedDate)) {
        fetchAllActiveSlots();
      }
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Doctor Availability Sidebar (1/3 Width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100/20 p-6 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiUser className="text-[#960c0c]" /> Quick Absence Manager
              </h3>
              <p className="text-slate-400 text-xs mt-1">Set a doctor's unavailability or reset status for any date range without selecting calendar dates.</p>
            </div>

            <form onSubmit={handleApplySidebarRange} className="space-y-5">
              {/* Doctor Search & Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">1. Search & Select Doctor</label>
                <input
                  type="text"
                  placeholder="Type doctor name..."
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 mb-2"
                />

                <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/45">
                  {searchedDoctors.length === 0 ? (
                    <p className="text-[10px] text-slate-400 p-3 text-center">No doctors found.</p>
                  ) : (
                    searchedDoctors.map((doc) => {
                      const isSelected = Number(sidebarDocId) === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSidebarDocId(doc.id)}
                          className={`p-2.5 text-xs cursor-pointer select-none transition-colors duration-200 flex items-center justify-between ${
                            isSelected
                              ? 'bg-red-50/70 text-[#960c0c] font-bold border-l-2 border-[#960c0c]'
                              : 'text-slate-650 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p>Dr. {doc.name.replace(/^Dr\.\s+/i, '')}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{doc.designation}</p>
                          </div>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-[#960c0c]" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">2. Start Date</label>
                <input
                  type="date"
                  value={sidebarStart}
                  onChange={(e) => setSidebarStart(e.target.value)}
                  min={getTodayDateString()}
                  required
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">3. End Date</label>
                <input
                  type="date"
                  value={sidebarEnd}
                  onChange={(e) => setSidebarEnd(e.target.value)}
                  min={sidebarStart || getTodayDateString()}
                  required
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                />
              </div>

              {/* Leave Status */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">4. Availability Status</label>
                <select
                  value={sidebarStatus}
                  onChange={(e) => setSidebarStatus(e.target.value)}
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                >
                  <option value="unavailable">Make Unavailable</option>
                  <option value="available">Make Available / Reset</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingSidebar}
                className="w-full bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-xs shadow-md shadow-red-950/10 cursor-pointer"
              >
                {submittingSidebar ? 'Applying Updates...' : 'Apply Availability'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Calendar & Overrides (2/3 Width) */}
        <div className="lg:col-span-2 space-y-8">
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
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
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
                  const isDocFullyUnavailableForDay = docSlots.length > 0 && docSlots.every(s => s.is_booked || s.is_manually_disabled);

                  return (
                    <div key={doc.id} className="space-y-4 p-5 border border-slate-100 bg-slate-50/30 rounded-2xl">
                      {/* Doctor Info */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100/50">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-800">Dr. {doc.name.replace(/^Dr\.\s+/i, '')}</h4>
                            {isDocFullyUnavailableForDay && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                Absent / Unavailable
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{doc.designation}</p>
                        </div>
                      </div>

                      {/* Doctor slots grid */}
                      {isLoading ? (
                        <p className="text-xs text-slate-400 animate-pulse py-2">Loading slots details...</p>
                      ) : docSlots.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No operational slots configured.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                          {docSlots.map((slot) => {
                            let statusClasses = '';

                            if (slot.is_booked) {
                              statusClasses = 'bg-slate-50 border-slate-200 text-slate-500';
                            } else if (slot.is_manually_disabled) {
                              statusClasses = 'bg-rose-50/20 border-rose-100 text-rose-800';
                            } else {
                              statusClasses = 'bg-emerald-50/20 border-emerald-100 text-emerald-800';
                            }

                            return (
                              <div
                                key={slot.id}
                                className={`flex flex-col gap-3.5 p-4 rounded-2xl border transition-all duration-300 ${statusClasses} shadow-[0_2px_8px_rgba(15,23,42,0.02)]`}
                              >
                                {/* Time & Status Badge */}
                                <div className="flex flex-col gap-2.5 pb-2 border-b border-slate-100/50">
                                  <div className="flex items-center gap-2">
                                    <FiClock className={`text-xs shrink-0 ${slot.is_booked ? 'text-slate-400' : slot.is_manually_disabled ? 'text-rose-500' : 'text-emerald-500'}`} />
                                    <span className="font-bold text-[11px] text-slate-800 tracking-tight whitespace-nowrap">
                                      {formatSlotRange(slot.start_time, slot.end_time)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 select-none ${
                                      slot.is_booked
                                        ? 'bg-slate-200 text-slate-600'
                                        : slot.is_manually_disabled
                                        ? 'bg-rose-100/70 text-rose-700 border border-rose-200/30'
                                        : 'bg-emerald-100/70 text-emerald-700 border border-emerald-200/30'
                                    }`}>
                                      {slot.is_booked ? 'Booked' : slot.is_manually_disabled ? 'Disabled' : 'Available'}
                                    </span>
                                  </div>
                                </div>

                                {/* Active / Inactive Toggle (segmented buttons) or Booked status */}
                                {slot.is_booked ? (
                                  <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100/80 p-2 rounded-xl border border-slate-200/30 text-center select-none">
                                    Booked (Locked)
                                  </div>
                                ) : (
                                  <div className="flex items-center bg-slate-100/85 border border-slate-200/40 rounded-xl p-0.5 mt-0.5 justify-between">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlot(doc.id, slot, false)}
                                      className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                        !slot.is_manually_disabled
                                          ? 'bg-emerald-600 text-white shadow-xs font-black'
                                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200/40'
                                      }`}
                                    >
                                      Enable
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSlot(doc.id, slot, true)}
                                      className={`flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                        slot.is_manually_disabled
                                          ? 'bg-rose-600 text-white shadow-xs font-black'
                                          : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200/40'
                                      }`}
                                    >
                                      Disable
                                    </button>
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
      </div>
    </div>
  );
};

export default DoctorAvailability;
