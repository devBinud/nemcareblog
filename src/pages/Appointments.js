import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCalendar, FiPlus, FiX, FiCheckCircle, FiXCircle, FiUser, FiMail, FiPhone, FiInfo, FiTrash2, FiClock, FiSearch, FiFileText, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
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

const Appointments = () => {
  const { toasts, removeToast, success, error } = useToast();

  // Core States
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lookups (for booking form)
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [bookingDeptId, setBookingDeptId] = useState('');
  const [bookingDocId, setBookingDocId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');

  // Available slots for selected doc/date
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingFormSlots, setLoadingFormSlots] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Filter States
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterDocId, setFilterDocId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDeptId, filterDocId, filterDate, filterSearch]);

  // Fetch Appointments List
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await apiFetch('/appointments');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setAppointments(data);
        localStorage.setItem('nemcare_appointments', JSON.stringify(data));
      } else {
        throw new Error('Failed to fetch appointments list');
      }
    } catch (err) {
      console.warn('API connection failed. Using local storage.', err);
      const local = localStorage.getItem('nemcare_appointments');
      if (local) {
        setAppointments(JSON.parse(local));
      } else {
        setAppointments([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Lookup Data for Form
  const fetchLookups = useCallback(async () => {
    try {
      const deptsRes = await apiFetch('/departments');
      const docsRes = await apiFetch('/doctors');

      let deptsData = [];
      let docsData = [];

      if (deptsRes.ok) {
        const json = await deptsRes.json();
        deptsData = json.data || json;
      }
      if (docsRes.ok) {
        const json = await docsRes.json();
        docsData = json.data || json;
      }

      setDepartments(deptsData);
      setDoctors(docsData);
    } catch (err) {
      console.warn('Lookup fetch failed.', err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchLookups();
  }, [fetchAppointments, fetchLookups]);

  // Fetch available slots dynamically when doctor and date change in booking form
  useEffect(() => {
    const fetchFormSlots = async () => {
      if (!bookingDocId || !bookingDate) {
        setAvailableSlots([]);
        return;
      }

      setLoadingFormSlots(true);
      try {
        const res = await apiFetch(`/doctors/${bookingDocId}/slots?date=${bookingDate}`);
        if (res.ok) {
          const json = await res.json();
          const slots = (json.data || json).slots || [];

          // Cross-reference with existing local and remote appointments to auto-disable booked slots
          const processedSlots = slots.map(s => {
            const isLocalBooked = appointments.some(app =>
              app.doctor_id === Number(bookingDocId) &&
              app.date === bookingDate &&
              (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
              app.status === 'booked'
            );
            if (isLocalBooked) {
              return { ...s, available: false, is_booked: true };
            }
            return s;
          });

          // Filter to show only available slots
          setAvailableSlots(processedSlots.filter(s => s.available));
        } else {
          throw new Error('Failed to fetch slots');
        }
      } catch (err) {
        console.warn('API slots fetch failed.', err);
        setAvailableSlots([]);
      } finally {
        setLoadingFormSlots(false);
      }
    };

    fetchFormSlots();
  }, [bookingDocId, bookingDate, appointments]);

  // Cancel Booking
  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await apiFetch(`/appointments/${id}/cancel`, {
        method: 'PUT',
      });

      if (res.ok) {
        success('Appointment cancelled successfully.');
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to cancel appointment');
      }
    } catch (err) {
      console.warn('API cancel failed. Updating local state (offline mode).', err);
      // Modify local state
      const updatedAppointments = appointments.map(app =>
        app.id === id ? { ...app, status: 'cancelled' } : app
      );
      setAppointments(updatedAppointments);
      localStorage.setItem('nemcare_appointments', JSON.stringify(updatedAppointments));
      success('Appointment cancelled successfully (offline mode).');
    }
  };

  // Submit Booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingDocId || !bookingSlotId || !bookingDate || !patientName.trim() || !patientPhone) {
      error('Please complete all required fields.');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(patientPhone)) {
      error('Phone number must be exactly 10 digits.');
      return;
    }

    setSubmittingBooking(true);
    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: Number(bookingDocId),
          slot_id: Number(bookingSlotId),
          date: bookingDate,
          patient_name: patientName,
          patient_email: patientEmail || undefined,
          patient_phone: patientPhone || undefined
        }),
      });

      if (res.ok) {
        success('Appointment booked successfully!');
        setIsModalOpen(false);
        resetForm();
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to book appointment');
      }
    } catch (err) {
      console.warn('API booking failed. Creating local booking (offline mode).', err);

      const selectedDoc = doctors.find(d => d.id === Number(bookingDocId));
      const selectedSlot = availableSlots.find(s => s.id === Number(bookingSlotId));
      const selectedDept = departments.find(d => d.id === Number(bookingDeptId)) ||
        departments.find(d => d.id === selectedDoc?.department_id);

      const newId = appointments.length ? Math.max(...appointments.map(a => a.id)) + 1 : 1;
      const newAppointment = {
        id: newId,
        patient_name: patientName,
        patient_email: patientEmail || 'N/A',
        patient_phone: patientPhone || 'N/A',
        doctor_id: Number(bookingDocId),
        doctor: { name: selectedDoc ? selectedDoc.name : 'Unknown Doctor' },
        department: { name: selectedDept ? selectedDept.name : 'Clinical Specialist' },
        date: bookingDate,
        start_time: selectedSlot ? selectedSlot.start_time : '00:00',
        end_time: selectedSlot ? selectedSlot.end_time : '00:00',
        status: 'booked',
        slot_id: Number(bookingSlotId)
      };

      const updatedAppointments = [newAppointment, ...appointments];
      setAppointments(updatedAppointments);
      localStorage.setItem('nemcare_appointments', JSON.stringify(updatedAppointments));
      success('Appointment booked successfully (offline mode)!');
      setIsModalOpen(false);
      resetForm();
    } finally {
      setSubmittingBooking(false);
    }
  };

  const resetForm = () => {
    setBookingDeptId('');
    setBookingDocId('');
    setBookingDate('');
    setBookingSlotId('');
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setAvailableSlots([]);
  };

  // Filtered Appointments list
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      // 1. Department Filter
      if (filterDeptId) {
        const matchedDoc = doctors.find(d => Number(d.id) === Number(app.doctor_id));
        const appDeptId = app.department_id || matchedDoc?.department_id;
        if (Number(appDeptId) !== Number(filterDeptId)) {
          return false;
        }
      }

      // 2. Doctor Filter
      if (filterDocId && Number(app.doctor_id) !== Number(filterDocId)) {
        return false;
      }

      // 3. Date Filter
      if (filterDate && app.date !== filterDate) {
        return false;
      }

      // 4. Search Filter
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase();
        const matchName = app.patient_name?.toLowerCase().includes(query);
        const matchEmail = app.patient_email?.toLowerCase().includes(query);
        const matchPhone = app.patient_phone?.includes(query);
        if (!matchName && !matchEmail && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, doctors, filterDeptId, filterDocId, filterDate, filterSearch]);

  // Paginated Appointments
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = useMemo(() => {
    return filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAppointments, currentPage]);

  // Compute Stats
  const totalBookings = filteredAppointments.length;
  const activeBookings = filteredAppointments.filter(a => a.status === 'booked').length;
  const cancelledBookings = filteredAppointments.filter(a => a.status === 'cancelled').length;

  // Export filtered appointments to CSV (Excel compatible)
  const handleExportToExcel = (fileNameInput) => {
    // Create CSV headers
    const headers = ['Booking ID', 'Patient Name', 'Email', 'Phone', 'Booking Date', 'Time Slot', 'Doctor', 'Department', 'Status'];
    
    // Convert appointments data to CSV rows
    const rows = filteredAppointments.map((app) => {
      const matchedDoc = doctors.find(d => Number(d.id) === Number(app.doctor_id));
      const docName = app.doctor?.name || matchedDoc?.name || 'Unknown Doctor';
      const cleanDocName = 'Dr. ' + docName.replace(/^Dr\.\s+/i, '');

      const matchedDept = departments.find(d => Number(d.id) === Number(matchedDoc?.department_id || app.department_id));
      const deptName = app.department?.name || matchedDept?.name || 'Medical Specialist';
      const formattedDeptName = deptName.toUpperCase();

      const formattedDate = new Date(app.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const formattedTime = formatSlotRange(app.start_time, app.end_time);
      const displayStatus = app.status === 'booked' ? 'ACTIVE' : 'CANCELLED';
      
      return [
        `#${String(app.id).padStart(4, '0')}`,
        app.patient_name,
        app.patient_email || 'N/A',
        app.patient_phone || 'N/A',
        formattedDate,
        formattedTime,
        cleanDocName,
        formattedDeptName,
        displayStatus
      ];
    });
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const finalFileName = (fileNameInput || `nemcare_appointments_${getTodayDateString()}`).trim();
    const cleanFileName = finalFileName.endsWith('.csv') ? finalFileName : `${finalFileName}.csv`;
    link.setAttribute('download', cleanFileName);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    success('Appointments exported successfully.');
  };

  // Filter Doctors by selected department in the booking form
  const filteredDoctors = bookingDeptId
    ? doctors.filter(doc => doc.department_id === Number(bookingDeptId))
    : doctors;

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Appointments Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1">Schedule and review patient appointments, manage status overrides.</p>
        </div>
      </div>

      {/* Numerical Stats Summary & Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100/30 p-4.5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl border bg-indigo-50 border-indigo-100/30 text-indigo-650 flex items-center justify-center shrink-0">
            <FiCalendar className="text-base" />
          </div>
          <div>
            <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Total Bookings</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{totalBookings}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100/30 p-4.5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-100/30 text-emerald-655 flex items-center justify-center shrink-0">
            <FiCheckCircle className="text-base" />
          </div>
          <div>
            <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Active Bookings</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{activeBookings}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100/30 p-4.5 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl border bg-rose-50 border-rose-100/30 text-rose-600 flex items-center justify-center shrink-0">
            <FiXCircle className="text-base" />
          </div>
          <div>
            <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Cancelled Bookings</p>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{cancelledBookings}</h3>
          </div>
        </div>

        {/* Clickable Quick Action Card: Book Appointment */}
        <div 
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-[#960c0c] hover:bg-[#800a0a] rounded-2xl border border-[#960c0c] p-4.5 flex items-center gap-3.5 shadow-sm cursor-pointer hover:shadow-lg transition-all duration-200 group"
        >
          <div className="p-2.5 rounded-xl border bg-white/10 border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
            <FiPlus className="text-base font-bold" />
          </div>
          <div>
            <p className="text-[9.5px] font-extrabold text-white/70 uppercase tracking-widest">Quick Booking</p>
            <h3 className="text-sm font-black text-white tracking-tight mt-0.5">
              Book Appointment
            </h3>
          </div>
        </div>
      </div>

      {/* Appointments Data Table */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Scheduled Patient Visits</h3>
          <button
            onClick={() => {
              setExportFileName(`nemcare_appointments_${getTodayDateString()}`);
              setIsExportModalOpen(true);
            }}
            className="px-3 py-2 border border-slate-200 text-slate-650 hover:text-[#960c0c] hover:bg-slate-50 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 shadow-3xs text-[10.5px] font-extrabold"
            title="Export filtered list as CSV"
          >
            <FiFileText className="text-xs" /> Export to Excel
          </button>
        </div>

        {/* Dynamic Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Department Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Filter Department</label>
            <select
              value={filterDeptId}
              onChange={(e) => {
                setFilterDeptId(e.target.value);
                setFilterDocId(''); // reset doctor filter if department changes
              }}
              className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2.5 text-xs text-slate-705 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Filter Doctor</label>
            <select
              value={filterDocId}
              onChange={(e) => setFilterDocId(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2.5 text-xs text-slate-705 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
            >
              <option value="">All Doctors</option>
              {(filterDeptId 
                ? doctors.filter(d => d.department_id === Number(filterDeptId))
                : doctors
              ).map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name.replace(/^Dr\.\s+/i, '')}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Filter Date</label>
            <div className="relative flex items-center">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="absolute right-2.5 text-slate-400 hover:text-rose-600 transition"
                  title="Clear Date"
                >
                  <FiX className="text-sm cursor-pointer" />
                </button>
              )}
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Search Patient</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50/70 rounded-xl pl-8 pr-8 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                <FiSearch className="text-xs" />
              </span>
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="text-sm cursor-pointer" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-width dashed divider */}
        <div className="border-b border-dashed border-slate-200 -mx-6 md:-mx-7 mb-6" />

        {loading ? (
          <p className="text-xs text-slate-400 animate-pulse py-6">Loading schedules...</p>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-455 font-medium">
              {appointments.length === 0 
                ? "No appointments scheduled. Click 'Book Appointment' to add one."
                : "No appointments match the selected filters."
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4 text-center w-24 border-r border-slate-200">Booking ID</th>
                  <th className="py-3 px-4 pl-5 border-r border-slate-200">Patient Name</th>
                  <th className="py-3 px-4 border-r border-slate-200">Contact Info</th>
                  <th className="py-3 px-4 border-r border-slate-200">Date</th>
                  <th className="py-3 px-4 border-r border-slate-200">Time Slots</th>
                  <th className="py-3 px-4 border-r border-slate-200">Doctor / Specialty</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.map((app, idx) => (
                  <tr key={app.id} className="hover:bg-slate-50/40 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium">
                    {/* Booking ID */}
                    <td className="py-3.5 px-4 text-center border-r border-slate-200 font-mono font-bold text-slate-600">
                      #{String(app.id).padStart(4, '0')}
                    </td>

                    {/* Patient Name */}
                    <td className="py-3.5 px-4 pl-5 font-bold text-slate-800 border-r border-slate-200">
                      {app.patient_name}
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4 text-slate-500 border-r border-slate-200">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold">{app.patient_email}</span>
                        <span>{app.patient_phone}</span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 border-r border-slate-200 font-semibold">
                      {new Date(app.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Time Slots */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-600 border-r border-slate-200">
                      {formatSlotRange(app.start_time, app.end_time)}
                    </td>

                    {/* Doctor */}
                    <td className="py-3.5 px-4 border-r border-slate-200">
                      {(() => {
                        const matchedDoc = doctors.find(d => Number(d.id) === Number(app.doctor_id));
                        const rawName = app.doctor?.name || matchedDoc?.name || '';
                        const cleanName = rawName.replace(/^Dr\.\s+/i, '');

                        const matchedDept = departments.find(d => Number(d.id) === Number(matchedDoc?.department_id || app.department_id));
                        const deptName = app.department?.name || matchedDept?.name || 'Medical Specialist';

                        return (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-700">
                              Dr. {cleanName || 'Unknown Doctor'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide font-extrabold">
                              {deptName}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center border-r border-slate-200">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${app.status === 'booked'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/10'
                        : 'bg-slate-150 text-slate-450 border border-slate-200/50'
                        }`}>
                        {app.status === 'booked' ? 'Active' : 'Cancelled'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      {app.status === 'booked' ? (
                        <button
                          onClick={() => handleCancelBooking(app.id)}
                          className="text-rose-600 hover:text-rose-700 font-bold text-[10px] hover:underline bg-rose-50/50 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FiTrash2 className="text-xs" /> Cancel
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px] italic">Released</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 mt-4">
              <span className="text-[11px] text-slate-450 font-medium">
                Showing <span className="font-bold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAppointments.length)}</span> to{' '}
                <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredAppointments.length)}</span> of{' '}
                <span className="font-bold text-slate-700">{filteredAppointments.length}</span> appointments
              </span>

              <div className="flex items-center gap-1.5">
                {/* Prev Button */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition duration-200 cursor-pointer shrink-0 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="text-xs" />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = currentPage === page;
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-7 w-7 text-xs font-bold rounded-lg transition duration-200 flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-[#960c0c] text-white shadow-3xs'
                          : 'border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition duration-200 cursor-pointer shrink-0 disabled:cursor-not-allowed"
                >
                  <FiChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Booking Dialog Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fade-in space-y-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiCalendar className="text-[#960c0c]" /> Book Patient Appointment
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleBookAppointment} className="space-y-4">

              {/* Doctor / Dept selection row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Departments</label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={bookingDeptId}
                    onChange={(e) => {
                      setBookingDeptId(e.target.value);
                      setBookingDocId(''); // reset doctor
                      setBookingSlotId(''); // reset slot
                    }}
                  >
                    <option value="">All Specialities</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Doctor *</label>
                  <select
                    className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                    value={bookingDocId}
                    onChange={(e) => {
                      setBookingDocId(e.target.value);
                      setBookingSlotId(''); // reset slot
                    }}
                    required
                  >
                    <option value="">Select Doctor</option>
                    {filteredDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.name.replace(/^Dr\.\s+/i, '')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Booking Date *</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300"
                  value={bookingDate}
                  onChange={(e) => {
                    setBookingDate(e.target.value);
                    setBookingSlotId(''); // reset slot
                  }}
                  min={getTodayDateString()}
                  required
                />
              </div>

              {/* Available Slots Select Radio Chips */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">
                  Select Time Slot *
                </label>

                {!bookingDocId || !bookingDate ? (
                  <p className="text-[11px] text-slate-400 italic">Please select a doctor and date to view available time slots.</p>
                ) : loadingFormSlots ? (
                  <p className="text-[11px] text-slate-400 animate-pulse">Checking slot openings...</p>
                ) : availableSlots.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-100/50 rounded-xl flex items-center gap-2">
                    <FiInfo className="text-rose-500 text-sm" />
                    <p className="text-[10px] text-rose-600 font-semibold">No operational slots are available on this date.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 max-h-[150px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/30">
                    {availableSlots.map((slot) => (
                      <label
                        key={slot.id}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all duration-200 select-none ${bookingSlotId === String(slot.id)
                          ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="bookingSlot"
                          value={slot.id}
                          className="sr-only"
                          checked={bookingSlotId === String(slot.id)}
                          onChange={(e) => setBookingSlotId(e.target.value)}
                        />
                        <FiClock className="mb-0.5 text-[10px]" />
                        <span className="text-[10px] tracking-tight text-center font-bold px-1">
                          {formatSlotRange(slot.start_time, slot.end_time)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Patient Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">Patient Credentials</h4>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Full Name *</label>
                  <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                    <FiUser className="text-slate-400 text-xs shrink-0" />
                    <input
                      type="text"
                      placeholder="e.g. Binud Sharma"
                      className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Email Address (Optional)</label>
                    <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                      <FiMail className="text-slate-400 text-xs shrink-0" />
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Phone Number *</label>
                    <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                      <FiPhone className="text-slate-400 text-xs shrink-0" />
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        required
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="Phone number must be exactly 10 digits."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-[#960c0c]/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer"
                >
                  {submittingBooking ? 'Booking Slot...' : 'Confirm Appointment'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Export Confirmation Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-6 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiFileText className="text-[#960c0c]" /> Export Appointments
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-450 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <p className="text-xs text-slate-605 leading-relaxed font-medium">
                Are you sure you want to export the filtered appointments list to an Excel-compatible CSV file?
              </p>

              {/* Custom File Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">File Name (.csv)</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  placeholder="e.g. appointments_report"
                  className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 font-bold"
                />
              </div>

              {/* Export Summary Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Export Parameters</h4>
                
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-655">
                  <div>Total Records:</div>
                  <div className="font-bold text-slate-800">{filteredAppointments.length}</div>
                  
                  <div>Department:</div>
                  <div className="font-bold text-slate-800 truncate">
                    {filterDeptId ? (departments.find(d => Number(d.id) === Number(filterDeptId))?.name || 'Selected') : 'All Departments'}
                  </div>
                  
                  <div>Doctor:</div>
                  <div className="font-bold text-slate-800 truncate">
                    {filterDocId ? `Dr. ${(doctors.find(d => Number(d.id) === Number(filterDocId))?.name || 'Selected').replace(/^Dr\.\s+/i, '')}` : 'All Doctors'}
                  </div>
                  
                  <div>Selected Date:</div>
                  <div className="font-bold text-slate-800">
                    {filterDate ? new Date(filterDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Dates'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportToExcel(exportFileName);
                  setIsExportModalOpen(false);
                }}
                className="bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer"
              >
                Yes, Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
