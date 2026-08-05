import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiClock, FiArrowLeft, FiCalendar, FiCheckCircle, FiSlash } from 'react-icons/fi';
import { apiFetch } from '../utils/api';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

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

const ManageDoctorSlots = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingSlotId, setTogglingSlotId] = useState(null);

  const cleanDateStr = useCallback((val) => {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes('T')) return str.split('T')[0];
    const parts = str.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].substring(0, 2).padStart(2, '0')}`;
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return str;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // DatePicker component
  const DatePickerDDMMYYYY = ({ value, onChange, className }) => {
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
        } catch (e) { }
      }
    };

    return (
      <div onClick={triggerPicker} className="relative flex items-center justify-center gap-2 cursor-pointer w-full group select-none">
        <FiCalendar className="text-slate-400 group-hover:text-[#960c0c] text-xs shrink-0 transition-colors" />
        <span className={`${className} font-black text-slate-800 text-xs cursor-pointer`}>
          {formattedDisplay || 'Select Date'}
        </span>
        <input
          ref={dateInputRef}
          type="date"
          value={cleanVal}
          min={getTodayDateString()}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
        />
      </div>
    );
  };

  // Fetch doctor info
  useEffect(() => {
    if (!doctorId) return;
    apiFetch(`/doctors/${doctorId}`)
      .then(res => res.json())
      .then(json => {
        setDoctor(json.data || json);
      })
      .catch(err => console.warn('Failed to load doctor', err));
  }, [doctorId]);

  // Fetch slots for selected date
  const fetchSlots = useCallback(async () => {
    if (!doctorId || !selectedDate) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/doctors/${doctorId}/slots?date=${selectedDate}`);
      if (res.ok) {
        const json = await res.json();
        const responseData = json.data || json;
        let slotList = responseData.slots || [];

        // If no custom slots, fetch master slots fallback
        if (slotList.length === 0) {
          const mRes = await apiFetch('/slots');
          if (mRes.ok) {
            const mJson = await mRes.json();
            const masterList = mJson.data || mJson;
            slotList = masterList.map(ms => ({
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
        setSlots(expandTo15MinSlots(slotList));
      }
    } catch (err) {
      console.warn('Failed to fetch doctor slots', err);
    } finally {
      setLoading(false);
    }
  }, [doctorId, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Stats calculation
  const availableCount = useMemo(() => {
    return slots.filter(s => !s.is_booked && !s.is_manually_disabled && !isSlotTimePassed(selectedDate, s.end_time)).length;
  }, [slots, selectedDate]);

  const disabledCount = useMemo(() => {
    return slots.filter(s => s.is_manually_disabled).length;
  }, [slots]);

  const bookedCount = useMemo(() => {
    return slots.filter(s => s.is_booked).length;
  }, [slots]);

  // Active / Inactive toggle with SweetAlert2 confirmation
  const handleToggleSlotStatus = async (slot) => {
    if (!doctorId || !selectedDate || !slot) return;
    if (slot.is_booked) {
      MySwal.fire({
        title: 'Slot Booked',
        text: 'This slot is already booked by a patient and cannot be deactivated.',
        icon: 'info',
        confirmButtonColor: '#960c0c'
      });
      return;
    }

    const isDeactivating = !slot.is_manually_disabled && slot.available;
    const timeRange = formatSlotRange(slot.start_time, slot.end_time);
    const docName = doctor?.name ? doctor.name.replace(/^Dr\.\s+/i, '') : '';

    const result = await MySwal.fire({
      title: isDeactivating ? 'Make Slot Inactive?' : 'Make Slot Active?',
      html: `
        <div class="text-left font-sans text-xs space-y-3 pt-1">
          <p class="text-slate-600 font-medium">
            Are you sure you want to <strong>${isDeactivating ? 'deactivate' : 'reactivate'}</strong> this 15-minute time slot for <strong>Dr. ${docName}</strong> on <strong>${formatDDMMYYYY(selectedDate)}</strong>?
          </p>
          <div class="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between font-bold">
            <span class="text-slate-800 text-sm">🕒 ${timeRange}</span>
            <span class="${isDeactivating ? 'text-rose-700 font-black uppercase text-[10px] bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200' : 'text-emerald-700 font-black uppercase text-[10px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200'}">
              ${isDeactivating ? 'Will become Inactive' : 'Will become Active'}
            </span>
          </div>
          ${isDeactivating ? '<p class="text-rose-500 text-[11px] font-semibold">⚠️ Patients will not be able to book appointments for this specific time slot.</p>' : ''}
        </div>
      `,
      icon: isDeactivating ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isDeactivating ? '#960c0c' : '#047857',
      cancelButtonColor: '#64748b',
      confirmButtonText: isDeactivating ? 'Yes, Make Inactive' : 'Yes, Make Active',
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8',
        confirmButton: 'px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer',
        cancelButton: 'px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer'
      }
    });

    if (!result.isConfirmed) return;

    setTogglingSlotId(slot.id);
    try {
      const res = await apiFetch(`/doctors/${doctorId}/slots/toggle`, {
        method: 'POST',
        body: JSON.stringify({
          slot_id: slot.master_slot_id,
          slab_start_time: slot.start_time,
          date: selectedDate,
          is_disabled: isDeactivating
        })
      });

      if (res.ok) {
        MySwal.fire({
          title: 'Success!',
          text: `Slot (${timeRange}) set to ${isDeactivating ? 'Inactive' : 'Active'} successfully.`,
          icon: 'success',
          confirmButtonColor: '#960c0c',
          timer: 1600,
          showConfirmButton: false
        });
        fetchSlots();
      } else {
        const json = await res.json();
        throw new Error(json.message || 'Failed to update slot status');
      }
    } catch (err) {
      console.error(err);
      MySwal.fire({
        title: 'Error',
        text: err.message || 'Failed to update slot status.',
        icon: 'error',
        confirmButtonColor: '#960c0c'
      });
    } finally {
      setTogglingSlotId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/availability/${doctorId}`)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
              >
                <FiArrowLeft className="text-base" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                  Manage 15-Min Slots — Dr. {doctor?.name ? doctor.name.replace(/^Dr\.\s+/i, '') : ''}
                </h1>
                <p className="text-slate-400 text-xs mt-0.5">
                  {doctor?.designation || 'Consultant'} • Doctor Slot Availability Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 px-4 py-2 rounded-2xl cursor-pointer shadow-2xs hover:border-[#960c0c]/40 transition duration-200">
              <DatePickerDDMMYYYY
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                className="border-0 bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate(`/availability/${doctorId}`)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl transition shadow-xs cursor-pointer"
            >
              Back to Calendar
            </button>
          </div>
        </div>

        {/* Full-width dashed border separating status pills inside Top Card */}
        <div className="pt-4 border-t border-dashed border-slate-200 flex flex-wrap items-center gap-2.5">
          <span className="px-3.5 py-1.5 rounded-2xl bg-emerald-100/80 text-emerald-800 text-xs font-black border border-emerald-200/80">
            🟢 {availableCount} Active Slots
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-slate-200/80 text-slate-700 text-xs font-black border border-slate-300/60">
            ⚪ {disabledCount} Inactive Slots
          </span>
          <span className="px-3.5 py-1.5 rounded-2xl bg-indigo-100/80 text-indigo-800 text-xs font-black border border-indigo-200/80">
            🔒 {bookedCount} Booked Slots
          </span>
        </div>
      </div>

      {/* Main 15-Minute Slots Grid Container */}
      <div className="bg-white rounded-3xl border border-slate-100/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(15,23,42,0.012)] space-y-6">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">
            15-Minute Time Slots ({slots.length})
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Click on any slot's action button to toggle Active or Inactive status.
          </p>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 animate-pulse py-8">Loading 15-minute slot details...</p>
        ) : slots.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-1">
            <p className="text-xs font-black text-slate-700">No Master Time Slots Configured</p>
            <p className="text-[11px] text-slate-400 font-medium">Please assign master schedule slots to this doctor first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {slots.map((slot) => {
              const hasPassed = isSlotTimePassed(selectedDate, slot.end_time);
              const isToggling = togglingSlotId === slot.id;
              const isInactive = slot.is_manually_disabled;
              const isBooked = slot.is_booked;

              let cardBg = 'bg-emerald-50/60 border-emerald-200/90 text-emerald-950 shadow-3xs hover:border-emerald-300';
              if (isBooked) {
                cardBg = 'bg-indigo-50/60 border-indigo-200/90 text-indigo-950 shadow-3xs';
              } else if (hasPassed) {
                cardBg = 'bg-slate-100/40 border-dashed border-slate-200 text-slate-400 opacity-60';
              } else if (isInactive) {
                cardBg = 'bg-slate-50 border-slate-200/90 text-slate-600 shadow-3xs';
              }

              return (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-200 ${cardBg}`}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <FiClock className={`text-xs shrink-0 ${isBooked ? 'text-indigo-600' : hasPassed ? 'text-slate-300' : isInactive ? 'text-slate-400' : 'text-emerald-700'}`} />
                    <span className="text-xs font-black tracking-tight whitespace-nowrap text-slate-800">
                      {formatSlotRange(slot.start_time, slot.end_time)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isBooked ? (
                      <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-2xs whitespace-nowrap">
                        Booked 🔒
                      </span>
                    ) : hasPassed ? (
                      <span className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500 whitespace-nowrap">
                        Passed
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleSlotStatus(slot)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs cursor-pointer shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
                          isInactive
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : 'bg-[#960c0c] hover:bg-[#b00f0f] text-white'
                        } ${isToggling ? 'opacity-70 animate-pulse' : ''}`}
                      >
                        {isToggling ? (
                          'Saving...'
                        ) : isInactive ? (
                          <>
                            <FiCheckCircle className="text-[10px]" />
                            <span>Make Active</span>
                          </>
                        ) : (
                          <>
                            <FiSlash className="text-[10px]" />
                            <span>Make Inactive</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDoctorSlots;
