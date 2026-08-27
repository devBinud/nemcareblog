import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCalendar, FiPlus, FiX, FiCheckCircle, FiXCircle, FiUser, FiMail, FiPhone, FiInfo, FiTrash2, FiClock, FiSearch, FiFileText, FiChevronLeft, FiChevronRight, FiDownload, FiEye, FiCheck, FiArrowRight, FiArrowLeft, FiLoader } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';

const MySwal = withReactContent(Swal);


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

const isTimeInPast = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return false;

  const todayStr = getTodayDateString();
  if (dateStr < todayStr) return true; // Past date -> all times are in past
  if (dateStr > todayStr) return false; // Future date -> future time slots

  // dateStr === todayStr (compare against current local time)
  const now = new Date();
  let hour = 0;
  let min = 0;

  const str = String(timeStr).trim().toLowerCase();
  const isPm = str.includes('pm');
  const isAm = str.includes('am');

  const clean = str.replace(/am|pm/g, '').trim();
  const parts = clean.split(':').map(p => parseInt(p, 10));

  if (parts.length >= 1 && !isNaN(parts[0])) {
    hour = parts[0];
  }
  if (parts.length >= 2 && !isNaN(parts[1])) {
    min = parts[1];
  }

  if (isPm && hour < 12) {
    hour += 12;
  }
  if (isAm && hour === 12) {
    hour = 0;
  }

  const slotDate = new Date();
  slotDate.setHours(hour, min, 0, 0);

  return slotDate < now;
};

const getMondayOfDate = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const getWeekDays = (mondayDate) => {
  if (!mondayDate) return [];
  const days = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = d.getDate();
    const formattedDisplay = `${dayNum} ${monthName}`;
    const fullDisplayDate = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    days.push({
      dateObj: d,
      dateStr,
      dayName,
      formattedDisplay,
      fullDisplayDate
    });
  }
  return days;
};

const Appointments = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { toasts, removeToast, success } = useToast();

  // Core States
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lookups (for booking form)
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Table Filter & Pagination States
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterDocId, setFilterDocId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Data Fetching Functions
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/appointments');
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.data || json);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiFetch('/departments');
      if (res.ok) {
        const json = await res.json();
        setDepartments(json.data || json);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiFetch('/doctors');
      if (res.ok) {
        const json = await res.json();
        setDoctors(json.data || json);
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchDepartments();
    fetchDoctors();
  }, [fetchAppointments, fetchDepartments, fetchDoctors]);

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv' | 'pdf'
  const [bookingDeptId, setBookingDeptId] = useState('');
  const [bookingDocId, setBookingDocId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlotId, setBookingSlotId] = useState('');
  const [selectedMasterId, setSelectedMasterId] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientType, setPatientType] = useState('new');
  const [uhid, setUhid] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // Booking Wizard Steps and Countdown Redirect
  const [bookingStep, setBookingStep] = useState(1); // 1: Select Doctor, 2: Patient Details, 3: Confirm
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Automatic 3-2-1 Countdown & Redirect for New Patients
  useEffect(() => {
    let timer;
    if (bookingSuccess && patientType === 'new') {
      setCountdown(3);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.replace('https://preregistration.nemcare.com');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(3);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [bookingSuccess, patientType]);

  // Weekly schedule states & Navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMondayOfDate(new Date()));
  const [weekSlotsData, setWeekSlotsData] = useState({});
  const [loadingWeekSlots, setLoadingWeekSlots] = useState(false);

  // Available slots for selected doc/date
  const [availableSlots, setAvailableSlots] = useState([]);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Fetch slots for all 6 days (Mon-Sat) of the selected week when doctor or currentWeekStart changes
  useEffect(() => {
    if (!bookingDocId || !currentWeekStart) {
      setWeekSlotsData({});
      return;
    }

    const days = getWeekDays(currentWeekStart);
    setLoadingWeekSlots(true);

    Promise.all(
      days.map(async (day) => {
        try {
          const res = await apiFetch(`/doctors/${bookingDocId}/slots?date=${day.dateStr}`);
          if (res.ok) {
            const json = await res.json();
            return { dateStr: day.dateStr, slots: (json.data || json).slots || [] };
          }
        } catch (err) {
          console.warn(`Failed to fetch slots for ${day.dateStr}`, err);
        }
        return { dateStr: day.dateStr, slots: [] };
      })
    ).then((results) => {
      const map = {};
      results.forEach(r => {
        map[r.dateStr] = r.slots;
      });
      setWeekSlotsData(map);
      setLoadingWeekSlots(false);
    });
  }, [bookingDocId, currentWeekStart]);

  // Set available slots for selected booking date based on weekSlotsData & appointments
  useEffect(() => {
    if (!bookingDocId || !bookingDate || !weekSlotsData[bookingDate]) {
      setAvailableSlots([]);
      return;
    }

    const slots = weekSlotsData[bookingDate] || [];
    const processedSlots = slots.map(s => {
      const isLocalBooked = appointments.some(app =>
        app.doctor_id === Number(bookingDocId) &&
        app.date === bookingDate &&
        (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
        app.status === 'booked'
      );
      const isPast = isTimeInPast(bookingDate, s.start_time);

      if (isLocalBooked) {
        return { ...s, available: false, is_booked: true };
      }
      if (isPast) {
        return { ...s, available: false, is_past: true };
      }
      return s;
    });

    setAvailableSlots(processedSlots);
  }, [bookingDocId, bookingDate, weekSlotsData, appointments]);

  // Compute status ("Available", "Already booked", "Unavailable") for a given dateStr
  const getDayStatus = useCallback((dateStr) => {
    const todayStr = getTodayDateString();
    if (dateStr < todayStr) return 'Already booked';

    const slots = weekSlotsData[dateStr] || [];
    if (slots.length === 0) return 'Already booked';

    let availableCount = 0;

    slots.forEach(s => {
      const isLocalBooked = appointments.some(app =>
        app.doctor_id === Number(bookingDocId) &&
        app.date === dateStr &&
        (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
        app.status === 'booked'
      );
      const isPast = isTimeInPast(dateStr, s.start_time);
      const isSlotBooked = s.is_booked || isLocalBooked;
      const isSlotDisabled = s.is_manually_disabled || s.available === false || isPast;

      if (!isSlotBooked && !isSlotDisabled) {
        availableCount++;
      }
    });

    if (availableCount > 0) return 'Available';
    return 'Already booked';
  }, [weekSlotsData, appointments, bookingDocId]);

  // Auto-select first available date or reset bookingDate if currently selected date is unavailable
  useEffect(() => {
    if (loadingWeekSlots) return;
    const days = getWeekDays(currentWeekStart);

    if (bookingDate && getDayStatus(bookingDate) !== 'Available') {
      const firstAvail = days.find(d => getDayStatus(d.dateStr) === 'Available');
      if (firstAvail) {
        setBookingDate(firstAvail.dateStr);
        setBookingSlotId('');
      } else {
        setBookingDate('');
        setBookingSlotId('');
      }
    } else if (!bookingDate && days.length > 0) {
      const firstAvail = days.find(d => getDayStatus(d.dateStr) === 'Available');
      if (firstAvail) {
        setBookingDate(firstAvail.dateStr);
      }
    }
  }, [weekSlotsData, loadingWeekSlots, currentWeekStart, bookingDate, getDayStatus]);

  const handleNextWeek = () => {
    const nextMon = new Date(currentWeekStart);
    nextMon.setDate(nextMon.getDate() + 7);
    setCurrentWeekStart(nextMon);
  };

  const selectedBookingDoctor = useMemo(() => {
    if (!bookingDocId) return null;
    return doctors.find(d => d.id === Number(bookingDocId)) || null;
  }, [bookingDocId, doctors]);

  // Group slots by master slot ID for hourly expandable view
  const groupedSlots = useMemo(() => {
    const groups = {};
    availableSlots.forEach(slot => {
      const mid = slot.master_slot_id;
      if (!groups[mid]) {
        groups[mid] = {
          master_slot_id: mid,
          slabs: []
        };
      }
      groups[mid].slabs.push(slot);
    });

    return Object.values(groups).map(group => {
      // Sort slabs by start_time ascending
      group.slabs.sort((a, b) => a.start_time.localeCompare(b.start_time));
      const firstSlab = group.slabs[0];
      const lastSlab = group.slabs[group.slabs.length - 1];
      return {
        ...group,
        master_start_time: firstSlab.start_time,
        master_end_time: lastSlab.end_time
      };
    }).sort((a, b) => a.master_start_time.localeCompare(b.master_start_time));
  }, [availableSlots]);

  // Cancel Booking (requires cancellation reason/notes)
  const handleCancelBooking = async (app) => {
    const appointment = typeof app === 'object' ? app : appointments.find(a => a.id === app);
    const appId = appointment?.id || app;
    const patientName = appointment?.patient_name || 'Patient';

    const result = await MySwal.fire({
      title: `<span class="text-[#960c0c] font-black tracking-tight">Cancel Appointment</span>`,
      html: `
        <div class="text-left space-y-4 font-sans text-xs">
          <div class="bg-rose-50/70 border border-rose-100/80 p-3 rounded-2xl flex items-center justify-between">
            <div>
              <p class="text-[10px] text-rose-500 font-extrabold uppercase tracking-wider">Target Booking</p>
              <p class="text-slate-800 font-bold text-sm">#${String(appId).padStart(4, '0')} - ${patientName}</p>
            </div>
            <span class="text-[10px] bg-rose-100 text-rose-700 font-black px-2.5 py-1 rounded-lg uppercase tracking-wide">Cancel Action</span>
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-700 mb-1">
              Cancellation Remarks / Notes <span class="text-rose-500">*</span>
            </label>
            <textarea
              id="swal-cancel-notes"
              rows="3"
              class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-[#960c0c] focus:ring-1 focus:ring-[#960c0c] text-slate-700 font-medium placeholder:text-slate-400 transition resize-none"
              placeholder="Enter remarks or reason for cancelling this appointment..."
            ></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#960c0c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Confirm Cancellation',
      cancelButtonText: 'Keep Appointment',
      customClass: {
        popup: 'rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8',
        confirmButton: 'px-5 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer',
        cancelButton: 'px-5 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer'
      },
      didOpen: () => {
        const notesInput = document.getElementById('swal-cancel-notes');
        if (notesInput) notesInput.focus();
      },
      preConfirm: () => {
        const notes = document.getElementById('swal-cancel-notes')?.value.trim();

        if (!notes) {
          MySwal.showValidationMessage('Please enter cancellation remarks.');
          return false;
        }

        return notes;
      }
    });

    if (!result.isConfirmed || !result.value) return;

    const cancellationReason = result.value;

    try {
      const res = await apiFetch(`/appointments/${appId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: cancellationReason })
      });

      if (res.ok) {
        MySwal.fire({
          title: 'Cancelled!',
          text: 'Appointment cancelled successfully.',
          icon: 'success',
          confirmButtonColor: '#960c0c'
        });
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to cancel appointment');
      }
    } catch (err) {
      MySwal.fire({
        title: 'Error',
        text: err.message || 'Failed to cancel appointment',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
    }
  };


  // Permanently Delete Appointment record
  const handleDeleteAppointment = async (id) => {
    const result = await MySwal.fire({
      title: 'Permanently Delete?',
      html: `<p style="font-size:13px;color:#475569">This will <strong>permanently remove</strong> appointment <strong>#${String(id).padStart(4, '0')}</strong> from the database.<br/>This action <strong>cannot be undone</strong>.</p>`,
      icon: 'error',
      showCancelButton: true,
      confirmButtonColor: '#7f1d1d',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete permanently!',
      cancelButtonText: 'No, keep it'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/appointments/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        MySwal.fire({
          title: 'Deleted!',
          text: 'Appointment record permanently deleted.',
          icon: 'success',
          confirmButtonColor: '#960c0c'
        });
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete appointment');
      }
    } catch (err) {
      MySwal.fire({
        title: 'Error',
        text: err.message || 'Failed to delete appointment',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
    }
  };

  // Update Status
  const handleUpdateStatus = async (id, newStatus) => {
    const result = await MySwal.fire({
      title: `Mark as ${newStatus === 'completed' ? 'Completed' : 'Active'}?`,
      text: `Are you sure you want to change this appointment's status to ${newStatus === 'completed' ? 'Completed' : 'Active'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#960c0c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, update it!',
      cancelButtonText: 'No, cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/appointments/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        MySwal.fire({
          title: 'Updated!',
          text: `Appointment status updated successfully.`,
          icon: 'success',
          confirmButtonColor: '#960c0c'
        });
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update status');
      }
    } catch (err) {
      MySwal.fire({
        title: 'Error',
        text: err.message || 'Failed to update status',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
    }
  };

  // View Symptoms / Notes SweetAlert Popup
  const handleViewSymptoms = (app) => {
    const isCancelled = app.status === 'cancelled' || Boolean(app.cancellation_reason);

    MySwal.fire({
      title: `<span class="text-[#960c0c] font-black tracking-tight">Patient & Booking Notes</span>`,
      html: `
        <div class="text-left space-y-3 font-sans text-xs">
          <div class="border-b border-dashed border-slate-200 pb-2 mb-2 flex items-center justify-between">
            <div>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient Name</p>
              <p class="text-slate-800 font-bold">${app.patient_name || 'N/A'}</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Booking ID</p>
              <p class="text-slate-800 font-bold">#${String(app.id).padStart(4, '0')}</p>
            </div>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Symptoms / Patient Notes</p>
            <p class="text-slate-750 bg-slate-50/80 border border-dashed border-slate-200 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap mt-1">
              ${app.symptoms || '<em class="text-slate-400">No initial symptoms or notes provided.</em>'}
            </p>
          </div>
          ${isCancelled ? `
            <div class="pt-2">
              <p class="text-[10px] text-rose-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <span>Cancellation Reason & Remarks</span>
              </p>
              <p class="text-rose-900 bg-rose-50/80 border border-rose-200/70 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap font-medium">
                ${app.cancellation_reason || '<em class="text-rose-400">No specific cancellation reason logged.</em>'}
              </p>
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'Close',
      confirmButtonColor: '#960c0c',
      customClass: {
        popup: 'rounded-3xl border border-slate-200/50 shadow-2xl p-6 md:p-8',
        confirmButton: 'px-6 py-2.5 rounded-xl text-xs font-bold transition duration-200 shadow-3xs cursor-pointer'
      }
    });
  };

  // Submit Booking
  const handleBookAppointment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!bookingDocId || !bookingSlotId || !bookingDate || !patientName.trim() || !patientPhone) {
      MySwal.fire({
        title: 'Error',
        text: 'Please complete all required fields.',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
      return;
    }

    const selectedSlab = availableSlots.find(s => String(s.id) === String(bookingSlotId));
    if (!selectedSlab) {
      MySwal.fire({
        title: 'Error',
        text: 'Selected slot details not found.',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
      return;
    }

    if (patientType === 'existing' && !uhid.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'UHID is required for existing patients.',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(patientPhone)) {
      MySwal.fire({
        title: 'Error',
        text: 'Phone number must be exactly 10 digits.',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
      return;
    }

    setSubmittingBooking(true);
    try {
      const res = await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: Number(bookingDocId),
          slot_id: Number(selectedSlab.master_slot_id),
          slab_start_time: selectedSlab.start_time,
          slab_end_time: selectedSlab.end_time,
          date: bookingDate,
          patient_name: patientName,
          patient_email: patientEmail || undefined,
          patient_phone: patientPhone || undefined,
          patient_type: patientType,
          uhid: patientType === 'existing' ? uhid : undefined,
          symptoms: symptoms.trim() || undefined
        }),
      });

      if (res.ok) {
        setBookingSuccess(true);
        setBookingStep(3);
        fetchAppointments();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to book appointment');
      }
    } catch (err) {
      MySwal.fire({
        title: 'Error',
        text: err.message || 'Failed to book appointment',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const resetForm = () => {
    setBookingDeptId('');
    setBookingDocId('');
    setBookingDate('');
    setBookingSlotId('');
    setSelectedMasterId(null);
    setPatientName('');
    setPatientEmail('');
    setPatientPhone('');
    setPatientType('new');
    setUhid('');
    setSymptoms('');
    setAvailableSlots([]);
    setWeekSlotsData({});
    setCurrentWeekStart(getMondayOfDate(new Date()));
    setBookingStep(1);
    setBookingSuccess(false);
    setCountdown(3);
  };

  // Filtered Appointments list
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter(app => {
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
      })
      // Sort newest bookings first (highest ID at top)
      .sort((a, b) => Number(b.id) - Number(a.id));
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

  // Build shared row data for exports
  const buildExportRows = () => {
    return filteredAppointments.map((app) => {
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
      const displayStatus = app.status === 'booked' ? 'ACTIVE' : app.status === 'completed' ? 'COMPLETED' : 'CANCELLED';

      return [
        `#${String(app.id).padStart(4, '0')}`,
        app.patient_name || 'N/A',
        app.patient_type === 'existing' ? 'EXISTING' : 'NEW',
        app.uhid || 'N/A',
        app.patient_email || 'N/A',
        app.patient_phone || 'N/A',
        formattedDate,
        formattedTime,
        cleanDocName,
        formattedDeptName,
        app.symptoms || '',
        app.cancellation_reason || '',
        displayStatus
      ];
    });
  };

  // Export filtered appointments to CSV (Excel compatible)
  const handleExportToExcel = (fileNameInput) => {
    const headers = ['Booking ID', 'Patient Name', 'Patient Type', 'UHID', 'Email', 'Phone', 'Booking Date', 'Time Slot', 'Doctor', 'Department', 'Symptoms / Notes', 'Cancellation Reason', 'Status'];
    const rows = buildExportRows();

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

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

    success('Appointments exported to CSV successfully.');
  };

  // Export filtered appointments to PDF using jsPDF + autoTable
  const handleExportToPDF = (fileNameInput) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(150, 12, 12); // #960c0c
    doc.rect(0, 0, 297, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('NEMCARE HOSPITAL', 14, 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Appointments Report', 14, 13);

    // Meta info line
    const generatedAt = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFontSize(7);
    doc.text(`Generated: ${generatedAt}  |  Total Records: ${filteredAppointments.length}`, 297 - 14, 13, { align: 'right' });

    // Table
    const headers = [['Booking ID', 'Patient Name', 'Type', 'UHID', 'Email', 'Phone', 'Date', 'Time Slot', 'Doctor', 'Department', 'Symptoms', 'Cancellation Reason', 'Status']];
    const rows = buildExportRows();

    autoTable(doc, {
      startY: 22,
      head: headers,
      body: rows,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        textColor: [30, 30, 40],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [30, 30, 40],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252],
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 26 },
        10: { cellWidth: 35 },
        11: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 11) {
          const val = data.cell.raw;
          if (val === 'ACTIVE') {
            data.cell.styles.textColor = [22, 163, 74];
          } else if (val === 'COMPLETED') {
            data.cell.styles.textColor = [99, 102, 241];
          } else if (val === 'CANCELLED') {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      margin: { left: 10, right: 10 },
    });

    // Footer page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 160);
      doc.text(
        `Page ${i} of ${pageCount}  |  NemCare Hospital Management System`,
        297 / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' }
      );
    }

    const finalFileName = (fileNameInput || `nemcare_appointments_${getTodayDateString()}`).trim();
    const cleanFileName = finalFileName.endsWith('.pdf') ? finalFileName : `${finalFileName}.pdf`;
    doc.save(cleanFileName);

    success('Appointments exported to PDF successfully.');
  };

  // Filter Doctors by selected department in the booking form
  const filteredDoctors = bookingDeptId
    ? doctors.filter(doc => Number(doc.department_id) === Number(bookingDeptId))
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
              setExportFormat('csv');
              setIsExportModalOpen(true);
            }}
            className="px-3 py-2 border border-slate-200 text-slate-650 hover:text-[#960c0c] hover:bg-slate-50 rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5 shadow-3xs text-[10.5px] font-extrabold"
            title="Export filtered appointments list"
          >
            <FiDownload className="text-xs" /> Export Report
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-3xs bg-white">
              <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                    <th className="py-3 px-4 text-center w-24 border-r border-slate-200 bg-slate-50">Booking ID</th>
                    <th className="py-3 px-4 pl-5 border-r border-slate-200 bg-slate-50">Patient Name</th>
                    <th className="py-3 px-4 border-r border-slate-200 bg-slate-50">Contact Info</th>
                    <th className="py-3 px-4 border-r border-slate-200 bg-slate-50">Date</th>
                    <th className="py-3 px-4 border-r border-slate-200 bg-slate-50">Time Slots</th>
                    <th className="py-3 px-4 border-r border-slate-200 bg-slate-50">Doctor / Specialty</th>
                    <th className="py-3 px-4 border-r border-slate-200 text-center bg-slate-50">Status</th>
                    <th className="py-3 px-4 text-center bg-slate-50">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.map((app, idx) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors duration-150 border-b border-slate-200 text-slate-600 font-medium">
                      {/* Booking ID */}
                      <td className="py-3.5 px-4 text-center border-r border-slate-200 font-mono font-bold text-slate-600">
                        #{String(app.id).padStart(4, '0')}
                      </td>

                      {/* Patient Name */}
                      <td className="py-3.5 px-4 pl-5 border-r border-slate-200">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 text-xs">{app.patient_name}</span>
                          <div className="flex items-center gap-1.5">
                            {app.patient_type === 'existing' ? (
                              <>
                                <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-650 border border-indigo-100/30 text-[8.5px] font-bold uppercase tracking-wider">
                                  Existing
                                </span>
                                {app.uhid && (
                                  <span className="font-mono text-[9px] font-bold text-indigo-700 bg-indigo-50/50 px-1 py-0.2 rounded border border-indigo-100/20">
                                    {app.uhid}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200/30 text-[8.5px] font-bold uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </div>
                        </div>
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
                          : app.status === 'completed'
                            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/10'
                            : 'bg-rose-50 text-rose-600 border border-rose-100/40'
                          }`}>
                          {app.status === 'booked' ? 'Active' : app.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          <button
                            onClick={() => handleViewSymptoms(app)}
                            className={`font-bold text-[10px] px-2.5 py-1.5 rounded-lg border transition-all duration-200 inline-flex items-center gap-1 cursor-pointer ${
                              app.status === 'cancelled'
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100/80 border-rose-200/80'
                                : 'text-indigo-650 bg-indigo-50/50 hover:bg-indigo-50 border-indigo-100/20'
                            }`}
                            title={app.status === 'cancelled' ? 'View Cancellation Remarks & Notes' : 'View Patient Symptoms & Notes'}
                          >
                            <FiEye className="text-xs shrink-0" /> {app.status === 'cancelled' ? 'View Remarks' : 'View Notes'}
                          </button>
                          {app.status === 'booked' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(app.id, 'completed')}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] bg-emerald-50/50 hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                                title="Mark as completed"
                              >
                                <FiCheckCircle className="text-xs shrink-0" /> Complete
                              </button>
                              <button
                                onClick={() => handleCancelBooking(app)}
                                className="text-amber-600 hover:text-amber-700 font-bold text-[10px] bg-amber-50/50 hover:bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                                title="Cancel appointment (requires reason notes)"
                              >
                                <FiXCircle className="text-xs shrink-0" /> Cancel
                              </button>
                            </>
                          )}
                          {app.status === 'completed' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'booked')}
                              className="text-slate-500 hover:text-slate-700 font-bold text-[10px] bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/40 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                              title="Revert status to Active"
                            >
                              Re-activate
                            </button>
                          )}
                          {/* Delete — visible only for admin role */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteAppointment(app.id)}
                              className="text-rose-600 hover:text-rose-700 font-bold text-[10px] bg-rose-50/40 hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                              title="Permanently delete this record (Admin only)"
                            >
                              <FiTrash2 className="text-xs shrink-0" /> Delete
                            </button>
                          )}
                        </div>
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
                        className={`h-7 w-7 text-xs font-bold rounded-lg transition duration-200 flex items-center justify-center cursor-pointer ${isActive
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
          <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 animate-fade-in space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <FiCalendar className="text-[#960c0c]" /> Book Patient Appointment
              </h3>
              {bookingStep < 3 && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-450 hover:text-slate-700 transition cursor-pointer"
                >
                  <FiX className="text-lg" />
                </button>
              )}
            </div>

            {/* Step Indicators */}
            {!bookingSuccess && (
              <div className="relative flex items-center justify-between pb-8 border-b border-slate-100/50 w-full px-6">
                {/* Continuous Line Behind Circles */}
                <div className="absolute top-[14px] left-[40px] right-[40px] h-0.5 bg-slate-200 -z-0" />
                <div
                  className="absolute top-[14px] left-[40px] h-0.5 bg-emerald-500 transition-all duration-300 -z-0"
                  style={{
                    right: bookingStep === 1 ? 'calc(100% - 40px)' : bookingStep === 2 ? '50%' : '40px'
                  }}
                />

                {/* Step 1: Select Doctor */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${bookingStep === 1
                      ? 'bg-[#960c0c] text-white'
                      : bookingStep > 1
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-450 border border-slate-200'
                      }`}
                  >
                    {bookingStep > 1 ? <FiCheck className="text-xs" /> : 1}
                  </div>
                  <span
                    className={`absolute top-8 text-[10px] font-bold tracking-tight capitalize whitespace-nowrap ${bookingStep === 1
                      ? 'text-[#960c0c]'
                      : bookingStep > 1
                        ? 'text-emerald-500'
                        : 'text-slate-400'
                      }`}
                  >
                    Select Doctor
                  </span>
                </div>

                {/* Step 2: Patient Details */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${bookingStep === 2
                      ? 'bg-[#960c0c] text-white'
                      : bookingStep > 2
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-450 border border-slate-200'
                      }`}
                  >
                    {bookingStep > 2 ? <FiCheck className="text-xs" /> : 2}
                  </div>
                  <span
                    className={`absolute top-8 text-[10px] font-bold tracking-tight capitalize whitespace-nowrap ${bookingStep === 2
                      ? 'text-[#960c0c]'
                      : bookingStep > 2
                        ? 'text-emerald-500'
                        : 'text-slate-400'
                      }`}
                  >
                    Patient Details
                  </span>
                </div>

                {/* Step 3: Confirm */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${bookingStep === 3
                      ? 'bg-[#960c0c] text-white'
                      : 'bg-slate-100 text-slate-450 border border-slate-200'
                      }`}
                  >
                    3
                  </div>
                  <span
                    className={`absolute top-8 text-[10px] font-bold tracking-tight capitalize whitespace-nowrap ${bookingStep === 3
                      ? 'text-[#960c0c]'
                      : 'text-slate-400'
                      }`}
                  >
                    Confirm
                  </span>
                </div>
              </div>
            )}

            {/* Modal Content */}
            <div className="space-y-4">
              {/* Step 1: Select Department & Doctor */}
              {bookingStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-800">Select Medical Speciality & Doctor</h4>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Departments</label>
                      <select
                        className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 font-semibold"
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
                        className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-3 py-3 text-xs text-slate-700 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 font-semibold"
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

                  {/* Doctor Details Preview divided by full-width dashed line */}
                  {selectedBookingDoctor && (
                    <div className="border-t border-dashed border-slate-200 pt-4 mt-4 animate-fade-in space-y-3">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Selected Doctor Information
                      </p>

                      <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#960c0c]/10 text-[#960c0c] flex items-center justify-center font-black text-lg shrink-0 border border-[#960c0c]/20">
                          {selectedBookingDoctor.name ? selectedBookingDoctor.name.replace(/^Dr\.\s+/i, '').charAt(0) : 'D'}
                        </div>

                        <div className="space-y-1 grow">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-black text-slate-800">
                              Dr. {selectedBookingDoctor.name.replace(/^Dr\.\s+/i, '')}
                            </h4>
                          </div>

                          <p className="text-xs font-semibold text-slate-600">
                            {selectedBookingDoctor.designation || 'Consultant Specialist'}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium mt-2">
                            <span>
                              <strong>Department:</strong> {departments.find(d => d.id === selectedBookingDoctor.department_id)?.name || 'General'}
                            </span>
                            {selectedBookingDoctor.qualification && (
                              <span>
                                <strong>Qualification:</strong> {selectedBookingDoctor.qualification}
                              </span>
                            )}
                            {selectedBookingDoctor.experience && (
                              <span>
                                <strong>Experience:</strong> {selectedBookingDoctor.experience}
                              </span>
                            )}
                            {selectedBookingDoctor.consultation_fee && (
                              <span className="text-[#960c0c] font-extrabold">
                                <strong>Fee:</strong> ₹{selectedBookingDoctor.consultation_fee}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1 Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      disabled={!bookingDocId}
                      className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer flex items-center gap-1.5"
                    >
                      Next: Patient Details <FiArrowRight className="text-[11px]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Patient Info, Slots, Symptoms */}
              {bookingStep === 2 && (
                <div className="space-y-4 animate-fade-in max-h-[60vh] overflow-y-auto pr-1">
                  {/* Patient Credentials */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800">Patient Details & Preferences</h4>

                    {/* Patient Type Card Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Patient Type *</label>
                      <div className="grid grid-cols-2 gap-4">
                        <label
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none ${patientType === 'new'
                            ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c] shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-750 hover:border-slate-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name="patientType"
                            value="new"
                            className="sr-only"
                            checked={patientType === 'new'}
                            onChange={() => {
                              setPatientType('new');
                              setUhid('');
                            }}
                          />
                          <span>New Patient</span>
                        </label>
                        <label
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none ${patientType === 'existing'
                            ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c] shadow-3xs'
                            : 'bg-white border-slate-200 text-slate-750 hover:border-slate-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name="patientType"
                            value="existing"
                            className="sr-only"
                            checked={patientType === 'existing'}
                            onChange={() => setPatientType('existing')}
                          />
                          <span>Existing Patient</span>
                        </label>
                      </div>
                    </div>

                    {/* Conditional UHID Input */}
                    {patientType === 'existing' && (
                      <div className="animate-fade-in">
                        <label className="text-[10px] font-bold text-[#960c0c] mb-1.5 uppercase tracking-wider block">UHID Number *</label>
                        <div className="flex items-center border border-[#960c0c]/40 bg-white rounded-xl px-4 py-3 focus-within:border-[#960c0c] transition-all duration-300">
                          <FiFileText className="text-[#960c0c] text-xs shrink-0" />
                          <input
                            type="text"
                            placeholder="e.g. UHID123456"
                            className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400 font-mono"
                            value={uhid}
                            onChange={(e) => setUhid(e.target.value.trim().toUpperCase())}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Full Name *</label>
                      <div className="flex items-center border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 focus-within:border-[#960c0c] focus-within:bg-white transition-all duration-300">
                        <FiUser className="text-slate-400 text-xs shrink-0" />
                        <input
                          type="text"
                          placeholder="e.g. John Sharma"
                          className="w-full pl-3 bg-transparent outline-none text-xs text-slate-800 placeholder-slate-400"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Email (Optional)</label>
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
                            maxLength={10}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Available Schedule Dates View */}
                    <div className="space-y-3.5 pt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Available Appointment Date *
                      </label>

                      {/* Filtered Days Cards Row (Only Available Dates) */}
                      {loadingWeekSlots ? (
                        <div className="py-8 text-center text-xs text-slate-400 animate-pulse bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                          Checking available doctor dates...
                        </div>
                      ) : (() => {
                        const availableDays = getWeekDays(currentWeekStart).filter(d => getDayStatus(d.dateStr) === 'Available');

                        if (availableDays.length === 0) {
                          return (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-2 animate-fade-in">
                              <p className="text-xs font-bold text-amber-900">No Available Appointment Dates This Week</p>
                              <p className="text-[11px] text-amber-700 font-medium max-w-md mx-auto">
                                All slots for Dr. {selectedBookingDoctor?.name ? selectedBookingDoctor.name.replace(/^Dr\.\s+/i, '') : ''} are currently booked or off-duty for this week.
                              </p>
                              <button
                                type="button"
                                onClick={handleNextWeek}
                                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-extrabold transition shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <span>Check Next Week</span>
                                <span>→</span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {availableDays.map((day) => {
                              const isSelected = bookingDate === day.dateStr;

                              return (
                                <button
                                  key={day.dateStr}
                                  type="button"
                                  onClick={() => {
                                    setBookingDate(day.dateStr);
                                    setBookingSlotId('');
                                    setSelectedMasterId(null);
                                  }}
                                  className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 select-none min-h-[90px] w-full cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-500/20 shadow-xs'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/40'
                                  }`}
                                >
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    {day.dayName}
                                  </span>

                                  <span className={`text-xs font-extrabold my-0.5 ${isSelected ? 'text-emerald-950 font-black' : 'text-slate-800'}`}>
                                    {day.formattedDisplay}
                                  </span>

                                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9.5px] font-black uppercase tracking-wider">
                                    Available
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Selected Date Display Banner */}
                      {bookingDate && getDayStatus(bookingDate) === 'Available' && (
                        <div className="bg-sky-50/80 border border-sky-100/90 rounded-xl px-4 py-2.5 text-xs font-bold text-sky-900 flex items-center gap-2">
                          <span className="text-sky-700">Selected Date:</span>
                          <span className="font-mono text-sky-950 font-black">
                            {getWeekDays(currentWeekStart).find(d => d.dateStr === bookingDate)?.fullDisplayDate ||
                              new Date(bookingDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                      )}

                      {/* Available Slots Section: 1. SELECT TIME SLOT *, 2. SELECT 15-MINUTE SLAB * */}
                      {bookingDate && getDayStatus(bookingDate) === 'Available' ? (
                        <div className="space-y-4 pt-2 animate-fade-in">
                          {/* 1. SELECT TIME SLOT * */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              SELECT TIME SLOT *
                            </label>

                            {groupedSlots.length === 0 ? (
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
                                No time slots configured for this date.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                {groupedSlots.map((group) => {
                                  const isGroupPast = isTimeInPast(bookingDate, group.master_end_time);
                                  const isGroupDisabled = isGroupPast || group.slabs.every(s => {
                                    const isLocalBooked = appointments.some(app =>
                                      app.doctor_id === Number(bookingDocId) &&
                                      app.date === bookingDate &&
                                      (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
                                      app.status === 'booked'
                                    );
                                    return s.available === false || s.is_booked || isLocalBooked || isTimeInPast(bookingDate, s.start_time) || s.is_manually_disabled;
                                  });

                                  const isMasterSelected = selectedMasterId === group.master_slot_id;

                                  return (
                                    <button
                                      key={group.master_slot_id}
                                      type="button"
                                      disabled={isGroupDisabled}
                                      onClick={() => {
                                        if (isGroupDisabled) return;
                                        setSelectedMasterId(group.master_slot_id);
                                        setBookingSlotId('');
                                      }}
                                      style={isMasterSelected ? { background: 'linear-gradient(to right, #fecaca 0%, #ffffff 100%)' } : {}}
                                      className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all duration-200 select-none flex items-center justify-center gap-2 ${isGroupDisabled
                                        ? 'opacity-40 bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : isMasterSelected
                                          ? 'border-[#960c0c] text-[#960c0c] font-black shadow-none cursor-pointer'
                                          : 'bg-white text-slate-700 border-slate-200/90 hover:border-[#960c0c]/50 hover:bg-slate-50/80 cursor-pointer shadow-none'
                                        }`}
                                    >
                                      <FiCalendar className={`text-xs shrink-0 ${isGroupDisabled ? 'text-slate-300' : isMasterSelected ? 'text-[#960c0c]' : 'text-slate-400'}`} />
                                      <span>{formatSlotRange(group.master_start_time, group.master_end_time)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* 2. SELECT 15-MINUTE SLAB * */}
                          {selectedMasterId && (() => {
                            const activeMasterGroup = groupedSlots.find(g => g.master_slot_id === selectedMasterId);
                            if (!activeMasterGroup) return null;

                            return (
                              <div className="space-y-1.5 pt-1 animate-fade-in">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  SELECT 15-MINUTE SLAB *
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                  {activeMasterGroup.slabs.map((slot) => {
                                    const isLocalBooked = appointments.some(app =>
                                      app.doctor_id === Number(bookingDocId) &&
                                      app.date === bookingDate &&
                                      (app.start_time === slot.start_time || Number(app.slot_id) === Number(slot.id)) &&
                                      app.status === 'booked'
                                    );
                                    const isSlotPast = isTimeInPast(bookingDate, slot.start_time);
                                    const isSlotDisabled = isSlotPast || slot.is_booked || isLocalBooked || slot.is_manually_disabled || slot.available === false;
                                    const isSlotSelected = bookingSlotId === String(slot.id);

                                    return (
                                      <button
                                        key={slot.id}
                                        type="button"
                                        disabled={isSlotDisabled}
                                        onClick={() => {
                                          if (isSlotDisabled) return;
                                          setBookingSlotId(String(slot.id));
                                        }}
                                        style={isSlotSelected ? { background: 'linear-gradient(to right, #fecaca 0%, #ffffff 100%)' } : {}}
                                        className={`py-3 px-3.5 rounded-xl border text-xs font-bold transition-all duration-200 select-none flex items-center justify-center gap-2 ${isSlotDisabled
                                          ? 'opacity-40 bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                          : isSlotSelected
                                            ? 'border-[#960c0c] text-[#960c0c] font-black shadow-none cursor-pointer'
                                            : 'bg-white text-slate-700 border-slate-200/90 hover:border-[#960c0c]/50 hover:bg-slate-50/80 cursor-pointer shadow-none'
                                          }`}
                                      >
                                        <FiClock className={`text-xs shrink-0 ${isSlotDisabled ? 'text-slate-300' : isSlotSelected ? 'text-[#960c0c]' : 'text-slate-400'}`} />
                                        <span>{formatSlotRange(slot.start_time, slot.end_time)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium italic">
                          Please select an available day above (marked in green) to view time slots.
                        </div>
                      )}

                      {/* Info Disclaimer Banner at Bottom */}
                      <div className="bg-rose-50/60 border border-rose-200/60 rounded-2xl p-3.5 flex items-start sm:items-center gap-2.5 mt-4">
                        <FiInfo className="text-rose-600 text-base shrink-0 mt-0.5 sm:mt-0" />
                        <p className="text-[11px] text-rose-800 font-semibold leading-relaxed">
                          Sundays are closed
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider block">Symptoms / Notes (Optional)</label>
                      <textarea
                        placeholder="Describe symptoms or add notes..."
                        rows="3"
                        className="w-full border border-slate-200 bg-slate-50/70 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#960c0c] focus:bg-white transition-all duration-300 min-h-[80px]"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5"
                    >
                      <FiArrowLeft className="text-[11px]" /> Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep(3)}
                      disabled={
                        !bookingDate ||
                        !bookingSlotId ||
                        !patientName.trim() ||
                        patientPhone.length !== 10 ||
                        (patientType === 'existing' && !uhid.trim())
                      }
                      className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer flex items-center gap-1.5"
                    >
                      Next: Review & Confirm <FiArrowRight className="text-[11px]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review Summary OR Success Redirect */}
              {bookingStep === 3 && (
                <div>
                  {!bookingSuccess ? (
                    <div className="space-y-4 animate-fade-in">
                      <h4 className="text-xs font-bold text-slate-800">Review & Confirm Appointment</h4>

                      {/* Summary Card */}
                      <div className="bg-slate-50/70 rounded-2xl border border-slate-200/60 p-4 space-y-3">
                        {/* Doctor Info */}
                        {(() => {
                          const matchedDoc = doctors.find(d => Number(d.id) === Number(bookingDocId));
                          const docName = matchedDoc?.name || 'Selected Doctor';
                          const matchedDept = departments.find(d => Number(d.id) === Number(matchedDoc?.department_id || bookingDeptId));
                          const deptName = matchedDept?.name || 'Specialist';
                          const selectedSlab = availableSlots.find(s => String(s.id) === String(bookingSlotId));
                          const slotTime = selectedSlab ? formatSlotRange(selectedSlab.start_time, selectedSlab.end_time) : 'Selected Slot';
                          const formattedDate = bookingDate ? new Date(bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

                          return (
                            <>
                              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                                <div>
                                  <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Doctor & Department</p>
                                  <p className="text-xs font-bold text-slate-800 mt-0.5">Dr. {docName.replace(/^Dr\.\s+/i, '')}</p>
                                  <p className="text-[10px] font-semibold text-[#960c0c]">{deptName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Schedule</p>
                                  <p className="text-xs font-bold text-slate-800 mt-0.5">{formattedDate}</p>
                                  <p className="text-[10px] font-semibold text-slate-600">{slotTime}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Patient Name</p>
                                  <p className="font-bold text-slate-800 mt-0.5">{patientName}</p>
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-650 text-[9px] font-extrabold uppercase mt-1">
                                    {patientType === 'existing' ? `Existing (${uhid})` : 'New Patient'}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Contact Info</p>
                                  <p className="font-bold text-slate-800 mt-0.5">{patientPhone}</p>
                                  {patientEmail && <p className="text-[10px] text-slate-500 font-medium truncate">{patientEmail}</p>}
                                </div>
                              </div>

                              {symptoms && (
                                <div className="pt-2 border-t border-slate-200/60">
                                  <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">Symptoms / Notes</p>
                                  <p className="text-[11px] text-slate-650 font-medium italic mt-0.5 line-clamp-2">"{symptoms}"</p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Step 3 Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="px-4 py-2.5 border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition duration-200 cursor-pointer flex items-center gap-1.5"
                        >
                          <FiArrowLeft className="text-[11px]" /> Back
                        </button>
                        <button
                          type="button"
                          onClick={handleBookAppointment}
                          disabled={submittingBooking}
                          className="bg-[#960c0c] hover:bg-[#c51c1c] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition duration-250 cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {submittingBooking ? (
                            <>
                              <FiLoader className="animate-spin text-xs" /> Confirming Booking...
                            </>
                          ) : (
                            <>
                              Confirm & Book Appointment <FiCheckCircle className="text-[11px]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-6 space-y-6 animate-fade-in">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full border border-emerald-100/50 flex items-center justify-center shadow-sm">
                        <FiCheckCircle className="text-4xl" />
                      </div>

                      <div className="space-y-1.5">
                        <h3 className="text-base font-black text-slate-800 tracking-tight">Your Appointment Booking is Successful!</h3>
                        <p className="text-slate-500 text-xs font-semibold leading-normal max-w-xs mx-auto">
                          Pre-registration is mandatory for new patients.
                        </p>
                      </div>

                      {patientType === 'new' ? (
                        <div className="w-full space-y-6 max-w-sm mx-auto flex flex-col items-center">
                          {/* Modern Stopwatch Timer */}
                          <div className="relative flex flex-col items-center justify-center my-1">
                            {/* Outer pulsing ring */}
                            <div className="w-24 h-24 rounded-full bg-[#960c0c]/10 border-2 border-[#960c0c]/20 flex items-center justify-center animate-pulse">
                              {/* Inner stopwatch badge */}
                              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#960c0c] to-[#c51c1c] text-white flex flex-col items-center justify-center shadow-lg shadow-[#960c0c]/30 transform transition-all duration-300 scale-105">
                                <span className="text-3xl font-black font-mono tracking-tight leading-none">
                                  {countdown}
                                </span>
                                <span className="text-[8px] font-extrabold uppercase tracking-widest text-white/80 mt-0.5">
                                  Sec
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-[#960c0c] text-[10px] font-black uppercase tracking-wider">
                              <FiClock className="animate-spin text-xs" /> Pre-Registration Redirect
                            </div>
                            <p className="text-[#960c0c] font-bold text-xs">
                              Redirecting to Nemcare Pre-Registration Portal in <span className="font-mono text-sm font-black">{countdown}</span> seconds...
                            </p>
                          </div>

                          {/* Animated smooth progress bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                            <div
                              className="bg-gradient-to-r from-[#960c0c] to-[#e63946] h-full rounded-full transition-all duration-1000 ease-linear"
                              style={{ width: `${(countdown / 3) * 100}%` }}
                            />
                          </div>

                          <div className="flex flex-col items-center gap-2 pt-1 w-full">
                            <a
                              href="https://preregistration.nemcare.com"
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.replace('https://preregistration.nemcare.com');
                              }}
                              className="bg-[#960c0c] hover:bg-[#800a0a] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 w-full"
                            >
                              <span>Redirect Now</span>
                              <FiArrowRight className="text-xs" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Confirmation Details for Existing Patients */}
                          <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 max-w-sm text-left">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Patient Type</span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100/50 uppercase">
                                Existing Patient
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">UHID Number</span>
                              <span className="text-xs font-black text-slate-800 font-mono tracking-wide">{uhid}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-1">
                              During hospital visit show this UHID no at reception.
                            </p>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsModalOpen(false);
                                resetForm();
                              }}
                              className="bg-[#960c0c] hover:bg-[#800a0a] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs transition duration-150 cursor-pointer"
                            >
                              Done & Close
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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
                Choose a format and export the filtered appointments list.
              </p>

              {/* Format Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Export Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none ${exportFormat === 'csv'
                      ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c] shadow-3xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <input type="radio" name="exportFormat" value="csv" className="sr-only" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} />
                    <FiFileText className="text-sm" />
                    <div className="flex flex-col items-center leading-tight">
                      <span>CSV</span>
                      <span className="text-[8px] font-medium opacity-60">Excel Compatible</span>
                    </div>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all duration-200 select-none ${exportFormat === 'pdf'
                      ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c] shadow-3xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <input type="radio" name="exportFormat" value="pdf" className="sr-only" checked={exportFormat === 'pdf'} onChange={() => setExportFormat('pdf')} />
                    <FiDownload className="text-sm" />
                    <div className="flex flex-col items-center leading-tight">
                      <span>PDF</span>
                      <span className="text-[8px] font-medium opacity-60">Printable Report</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Custom File Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  File Name (.{exportFormat})
                </label>
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
                  if (exportFormat === 'pdf') {
                    handleExportToPDF(exportFileName);
                  } else {
                    handleExportToExcel(exportFileName);
                  }
                  setIsExportModalOpen(false);
                }}
                className="bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-250 cursor-pointer flex items-center gap-1.5"
              >
                <FiDownload className="text-xs" />
                Export {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
