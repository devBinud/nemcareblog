import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiPlus, FiX, FiCheckCircle, FiXCircle, FiUser, FiMail, FiPhone, FiInfo, FiTrash2, FiClock } from 'react-icons/fi';
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

// Mock data fallbacks moved outside the component to prevent recreating on every render
const mockDepts = [
  { id: 1, name: 'Cardiology' },
  { id: 2, name: 'Pediatrics' },
  { id: 3, name: 'Neurology' }
];

const mockDocs = [
  { id: 1, name: 'Dr. Sarah Connor', designation: 'Senior Cardiologist', department_id: 1 },
  { id: 2, name: 'Dr. Alan Vance', designation: 'Pediatric Consultant', department_id: 2 },
  { id: 3, name: 'Dr. Robert Carter', designation: 'Chief Neurologist', department_id: 3 }
];

const mockAppointments = [
  {
    id: 1,
    patient_name: 'John Doe',
    patient_email: 'john@example.com',
    patient_phone: '1234567890',
    doctor_id: 1,
    doctor: { name: 'Dr. Sarah Connor' },
    department: { name: 'Cardiology' },
    date: '2026-06-15',
    start_time: '10:00',
    end_time: '10:15',
    status: 'booked'
  },
  {
    id: 2,
    patient_name: 'Jane Smith',
    patient_email: 'jane@example.com',
    patient_phone: '9876543210',
    doctor_id: 2,
    doctor: { name: 'Dr. Alan Vance' },
    department: { name: 'Pediatrics' },
    date: '2026-06-16',
    start_time: '09:15',
    end_time: '09:30',
    status: 'cancelled'
  },
  {
    id: 3,
    patient_name: 'Robert Miller',
    patient_email: 'robert@example.com',
    patient_phone: '5551234567',
    doctor_id: 3,
    doctor: { name: 'Dr. Robert Carter' },
    department: { name: 'Neurology' },
    date: '2026-06-18',
    start_time: '11:00',
    end_time: '11:15',
    status: 'booked'
  }
];

const defaultMockSlots = [
  { id: 1, start_time: '09:00', end_time: '09:15', available: true },
  { id: 2, start_time: '09:15', end_time: '09:30', available: false },
  { id: 3, start_time: '09:30', end_time: '09:45', available: true },
  { id: 4, start_time: '09:45', end_time: '10:00', available: true },
  { id: 5, start_time: '10:00', end_time: '10:15', available: true },
  { id: 6, start_time: '10:15', end_time: '10:30', available: false },
  { id: 7, start_time: '11:00', end_time: '11:15', available: true },
  { id: 8, start_time: '11:15', end_time: '11:30', available: true },
];

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
      console.warn('API connection failed. Using local storage or mock appointments.', err);
      const local = localStorage.getItem('nemcare_appointments');
      if (local) {
        setAppointments(JSON.parse(local));
      } else {
        setAppointments(mockAppointments);
        localStorage.setItem('nemcare_appointments', JSON.stringify(mockAppointments));
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

      let deptsData = mockDepts;
      let docsData = mockDocs;

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
      console.warn('Lookup fetch failed. Using default mock definitions.', err);
      setDepartments(mockDepts);
      setDoctors(mockDocs);
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
        console.warn('API slots fetch failed. Mocking available slots.', err);

        // Load manual overrides from localStorage to cross-reference
        const localOverridesStr = localStorage.getItem('nemcare_availability_overrides');
        const localOverrides = localOverridesStr ? JSON.parse(localOverridesStr) : {};

        // Fallback to default mock slots, cross-referenced with local appointments and overrides
        const processedMockSlots = defaultMockSlots.map(s => {
          const isLocalBooked = appointments.some(app =>
            app.doctor_id === Number(bookingDocId) &&
            app.date === bookingDate &&
            (app.start_time === s.start_time || Number(app.slot_id) === Number(s.id)) &&
            app.status === 'booked'
          );

          const overrideKey = `${bookingDocId}-${bookingDate}-${s.id}`;
          const isManuallyDisabled = localOverrides[overrideKey] !== undefined
            ? localOverrides[overrideKey]
            : s.is_manually_disabled;

          return {
            ...s,
            is_booked: isLocalBooked,
            is_manually_disabled: !isLocalBooked && isManuallyDisabled,
            available: !isLocalBooked && !isManuallyDisabled
          };
        });

        setAvailableSlots(processedMockSlots.filter(s => s.available));
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

  // Compute Stats
  const totalBookings = appointments.length;
  const activeBookings = appointments.filter(a => a.status === 'booked').length;
  const cancelledBookings = appointments.filter(a => a.status === 'cancelled').length;

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
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-[#960c0c] hover:bg-[#c51c1c] text-white text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-red-950/10 transition-all duration-300 cursor-pointer self-start sm:self-center"
        >
          <FiPlus className="text-sm" />
          Book Appointment (Admin Side)
        </button>
      </div>

      {/* Numerical Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      </div>

      {/* Appointments Data Table */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
        <h3 className="text-base font-bold text-slate-800 tracking-tight mb-4">Scheduled Patient Visits</h3>

        {loading ? (
          <p className="text-xs text-slate-400 animate-pulse py-6">Loading schedules...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-400">No appointments scheduled. Click 'Book Appointment' to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4 pl-5">Patient Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time Slots</th>
                  <th className="py-3 px-4">Doctor / Specialty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors duration-150 border-b border-slate-100/50 text-slate-600 font-medium">
                    <td className="py-4 px-4 pl-5 font-bold text-slate-800">
                      {app.patient_name}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400 font-semibold">{app.patient_email}</span>
                        <span>{app.patient_phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(app.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-600">
                      {formatSlotRange(app.start_time, app.end_time)}
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${app.status === 'booked'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/10'
                        : 'bg-slate-150 text-slate-450 border border-slate-200/50'
                        }`}>
                        {app.status === 'booked' ? 'Active' : 'Cancelled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right pr-6">
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
    </div>
  );
};

export default Appointments;
