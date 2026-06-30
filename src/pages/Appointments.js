import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiCalendar, FiPlus, FiX, FiCheckCircle, FiXCircle, FiUser, FiMail, FiPhone, FiInfo, FiTrash2, FiClock, FiSearch, FiFileText, FiChevronLeft, FiChevronRight, FiDownload } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const Appointments = () => {
  const { toasts, removeToast, success } = useToast();

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

          // Keep all slots (both available and booked) to show them in the UI
          setAvailableSlots(processedSlots);
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

  // Cancel Booking (changes status to 'cancelled')
  const handleCancelBooking = async (id) => {
    const result = await MySwal.fire({
      title: 'Cancel Appointment?',
      text: 'Are you sure you want to cancel this appointment? The record will remain.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#960c0c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'No, keep it'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/appointments/${id}/cancel`, {
        method: 'PUT',
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

  // Submit Booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
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
          uhid: patientType === 'existing' ? uhid : undefined
        }),
      });

      if (res.ok) {
        MySwal.fire({
          title: 'Success!',
          text: 'Appointment booked successfully!',
          icon: 'success',
          confirmButtonColor: '#960c0c'
        });
        setIsModalOpen(false);
        resetForm();
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
    setAvailableSlots([]);
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
        displayStatus
      ];
    });
  };

  // Export filtered appointments to CSV (Excel compatible)
  const handleExportToExcel = (fileNameInput) => {
    const headers = ['Booking ID', 'Patient Name', 'Patient Type', 'UHID', 'Email', 'Phone', 'Booking Date', 'Time Slot', 'Doctor', 'Department', 'Status'];
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
    const headers = [['Booking ID', 'Patient Name', 'Type', 'UHID', 'Email', 'Phone', 'Date', 'Time Slot', 'Doctor', 'Department', 'Status']];
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
        10: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 10) {
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
                            : 'bg-slate-150 text-slate-450 border border-slate-200/50'
                          }`}>
                          {app.status === 'booked' ? 'Active' : app.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
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
                                onClick={() => handleCancelBooking(app.id)}
                                className="text-amber-600 hover:text-amber-700 font-bold text-[10px] bg-amber-50/50 hover:bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                                title="Cancel appointment (keeps record)"
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
                          {app.status === 'cancelled' && (
                            <span className="text-slate-400 text-[10px] italic">Cancelled</span>
                          )}
                          {/* Delete — always visible for all statuses */}
                          <button
                            onClick={() => handleDeleteAppointment(app.id)}
                            className="text-rose-600 hover:text-rose-700 font-bold text-[10px] bg-rose-50/40 hover:bg-rose-50 px-2 py-1.5 rounded-lg border border-rose-100/20 transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                            title="Permanently delete this record"
                          >
                            <FiTrash2 className="text-xs shrink-0" /> Delete
                          </button>
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
                  <div className="space-y-4">
                    {/* Hourly Master Slots Grid */}
                    <div className="grid grid-cols-2 gap-2.5 max-h-[150px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/30">
                      {groupedSlots.map((group) => {
                        const isSelected = selectedMasterId === group.master_slot_id;
                        return (
                          <button
                            key={group.master_slot_id}
                            type="button"
                            onClick={() => {
                              setSelectedMasterId(group.master_slot_id);
                              // Reset specific 15-min slab selection if switching hours
                              const currentSelectedSlab = availableSlots.find(s => String(s.id) === String(bookingSlotId));
                              if (!currentSelectedSlab || currentSelectedSlab.master_slot_id !== group.master_slot_id) {
                                setBookingSlotId('');
                              }
                            }}
                            className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all duration-200 select-none ${isSelected
                              ? 'bg-slate-800 text-white border-slate-800 shadow-3xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-355'
                              }`}
                          >
                            <FiCalendar className="text-[10px] shrink-0" />
                            <span className="text-[10px] tracking-tight text-center font-bold">
                              {formatSlotRange(group.master_start_time, group.master_end_time)}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 15-Minute Slabs for the Selected Hour */}
                    {selectedMasterId && (
                      <div className="animate-fade-in space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          Select 15-Minute Slab *
                        </label>
                        <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto p-1 border border-slate-100 rounded-xl bg-white shadow-3xs">
                          {(groupedSlots.find(g => g.master_slot_id === selectedMasterId)?.slabs || []).map((slot) => {
                            const isSlabSelected = bookingSlotId === String(slot.id);
                            const isBooked = slot.is_booked || !slot.available;
                            return (
                              <label
                                key={slot.id}
                                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[10px] font-bold transition-all duration-200 select-none ${isBooked
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : isSlabSelected
                                    ? 'bg-[#960c0c]/5 border-[#960c0c] text-[#960c0c] cursor-pointer'
                                    : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-slate-350 cursor-pointer'
                                  }`}
                              >
                                <input
                                  type="radio"
                                  name="bookingSlot"
                                  value={slot.id}
                                  className="sr-only"
                                  checked={isSlabSelected}
                                  disabled={isBooked}
                                  onChange={(e) => !isBooked && setBookingSlotId(e.target.value)}
                                />
                                <FiClock className="text-[9px] shrink-0" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] tracking-tight text-center font-bold">
                                    {formatSlotRange(slot.start_time, slot.end_time)}
                                  </span>
                                  {isBooked && <span className="text-[7.5px] text-rose-500 font-black mt-0.5 leading-none">(Booked)</span>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Patient Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">Patient Credentials</h4>

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
                        onChange={() => setPatientType('new')}
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
                        required={patientType === 'existing'}
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
