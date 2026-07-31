# Frontend & Public Website Integration Flow Guide: Hospital Booking System

This guide outlines the logical flow, endpoints, request payloads, query parameters, UI component logic, and post-booking flows needed to integrate the Nemcare Hospital appointment booking system into both the **Admin Panel** and the **Public Patient-Facing Website**.

---

## Access & Authentication Scope

| Scope | Who Uses It | Authentication Header | Endpoints Accessible |
|---|---|---|---|
| **Public Website** | Patients / Visitors | **None** (Public endpoints) | List Departments, List Doctors, View Doctor Slots by Date, Submit Appointment Booking |
| **Admin Panel** | Hospital Staff / Admin | `Authorization: Bearer <ADMIN_JWT_TOKEN>` | All public endpoints + Department CRUD, Doctor CRUD, Master Slot Configuration, Availability Overrides, View All Bookings, Update/Cancel/Delete Bookings |

---

## Flow 1: Department & Doctor Management (Admin Panel)

### 1. Add Department
* **Action**: Admin enters department details.
* **Endpoint**: `POST /api/departments`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "name": "Cardiology",
    "description": "Optional text description"
  }
  ```

### 2. List Departments (Public & Admin)
* **Endpoint**: `GET /api/departments`
* **Headers**: None (Public)
* **Response structure**:
  - `data`: Array of objects `[{ id, name, description }]`

### 3. Add Doctor Profile (Admin)
* **Action**: Admin enters doctor details and assigns active master slots.
* **Endpoint**: `POST /api/doctors`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "name": "Dr. Biswajit Deuri",
    "designation": "Senior Consultant",
    "department_id": 1,
    "image_url": "/uploads/doctors/biswajit.jpg",       // Optional
    "experience_years": "16+ Years",                    // Optional
    "specialty": "Gastrointestinal Surgery",            // Optional
    "bio": "Specialist in GI, hepatobiliary...",        // Optional
    "education": "MBBS, MS (Gen. Surgery)...",          // Optional
    "previous_experience": "Apollo New Delhi...",       // Optional
    "areas_of_expertise": "Laparoscopic Surgery...",    // Optional
    "achievements": "Academic Bursary (2014)...",       // Optional
    "contact_email": "deuribiswajit@gmail.com",         // Optional
    "slot_ids": [1, 2, 3, 4]                            // Optional: array of master slot IDs
  }
  ```

### 4. Edit Doctor Profile (Admin)
* **Endpoint**: `PUT /api/doctors/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

### 5. Assign/Edit Doctor Slots (Admin)
* **Endpoint**: `POST /api/doctors/:id/slots`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "slot_ids": [1, 2, 5, 8]
  }
  ```

### 6. Delete Doctor Profile (Admin)
* **Endpoint**: `DELETE /api/doctors/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Note**: Fails with `400 Bad Request` if doctor has active upcoming appointments.

---

## Flow 2: Time Slots Configuration (Master Slots - Admin Panel)

### 1. Add Master Time Slot
* **Endpoint**: `POST /api/slots`
* **Payload**: `{ "start_time": "10:00", "end_time": "10:15" }`

### 2. View All Master Slots
* **Endpoint**: `GET /api/slots`

### 3. Update / Delete Master Time Slot
* **Endpoints**: `PUT /api/slots/:id` and `DELETE /api/slots/:id`

---

## Flow 3: Managing Doctor Availability (Doctor Overrides - Admin Panel)

### 1. Retrieve Dynamic Availability Status (Public & Admin)
* **Endpoint**: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
* **Behavior**: Returns time slots assigned to the doctor for the given date.
* **Response structure**:
  ```json
  {
    "doctor": { "id": 1, "name": "Dr. Sarah Connor" },
    "date": "2026-06-15",
    "slots": [
      {
        "id": 1,
        "master_slot_id": 1,
        "start_time": "10:00",
        "end_time": "10:15",
        "is_booked": false,
        "is_manually_disabled": false,
        "available": true
      }
    ]
  }
  ```

### 2. Toggle Slot Availability Override (Admin)
* **Endpoint**: `POST /api/doctors/:id/slots/toggle`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**: `{ "slot_id": 1, "date": "2026-06-15", "is_disabled": true }`

### 3. Bulk Day Overrides (Admin)
* **Disable all slots for day**: `POST /api/doctors/:id/unavailable` payload `{ "date": "YYYY-MM-DD" }`
* **Enable all slots for day**: `POST /api/doctors/:id/available` payload `{ "date": "YYYY-MM-DD" }`

---

## Flow 4: Appointment Booking API Endpoints (Public & Admin)

### 1. Book an Appointment
* **Action**: Patient or Admin submits booking.
* **Endpoint**: `POST /api/appointments`
* **Headers**: None required for public website; optional Bearer token for admin.
* **Payload**:
  ```json
  {
    "doctor_id": 1,                         // Required (Integer)
    "slot_id": 1,                           // Required (Master Slot ID, Integer)
    "slab_start_time": "10:00",             // Required (HH:MM string)
    "slab_end_time": "10:15",               // Required (HH:MM string)
    "date": "2026-06-15",                   // Required (YYYY-MM-DD string)
    "patient_name": "John Doe",             // Required (String)
    "patient_phone": "9876543210",          // Required (10 digits string)
    "patient_email": "john@example.com",    // Optional (String)
    "patient_type": "new",                  // Required: "new" or "existing"
    "uhid": "UHID123456",                   // Required if patient_type === "existing"
    "symptoms": "Chest pain and fatigue",   // Optional (String)
    "payment_method": "upi",                // Optional/Required: "card" or "upi"
    "amount": 500,                          // Optional (Number)
    "transaction_id": "TXN98765432"         // Optional (String)
  }
  ```

### 2. List All Bookings (Admin Panel Table)
* **Endpoint**: `GET /api/appointments`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

### 3. Update Status / Cancel Appointment (Admin)
* **Update Status**: `PUT /api/appointments/:id/status` payload `{ "status": "completed" }`
* **Cancel Booking**: `PUT /api/appointments/:id/cancel`
* **Delete Booking**: `DELETE /api/appointments/:id`

---

## Flow 5: Frontend Website & Admin - 3-Step Appointment Wizard Implementation Guide

The booking wizard modal is structured as a **3-Step Flow**. The same wizard logic applies to both the Public Frontend Website and the Admin Panel.

```
[ Step 1: Select Doctor ] ──────> [ Step 2: Patient Info & Slots ] ──────> [ Step 3: Payment & Confirm ]
```

---

### Step 1: Select Speciality & Doctor
1. **Department Filter**: Dropdown populates from `GET /api/departments`.
2. **Doctor Selector**: Dropdown populates from `GET /api/doctors`. Selecting a department filters the doctor dropdown.
3. **Next Button**: Enabled only when `doctor_id` is selected.

---

### Step 2: Patient Info, Schedule & Slot Selection

#### 1. Patient Type Selector (New vs. Existing Patient)
- Render two styled radio cards:
  - **New Patient (`patient_type === 'new'`)**: Clears `uhid` input.
  - **Existing Patient (`patient_type === 'existing'`)**: Renders mandatory **UHID Number** text input.

```jsx
// Validation Rule
if (patientType === 'existing' && !uhid.trim()) {
  showError('UHID is required for existing patients.');
}
```

#### 2. Patient Contact Details
- **Full Name**: Required.
- **Phone Number**: Required, exactly 10 digits (`/^[0-9]{10}$/`).
- **Email**: Optional.
- **Symptoms / Notes**: Optional textarea.

#### 3. 6-Day Weekly Schedule Selector (Mon – Sat)
- Displays 6 horizontal date cards for the current week starting Monday.
- Sundays are closed (`Sundays are closed` disclaimer badge).
- Fetch slot data for all 6 days in parallel:
  ```js
  GET /api/doctors/:doctor_id/slots?date=YYYY-MM-DD
  ```
- **Date Card Status Rules**:
  - **"Available"** (Green text/icon): Day has at least 1 unbooked, unpast, active slot.
  - **"Already booked"** (Grey/Disabled): Day is in the past, or all slots are booked/disabled.

#### 4. Slot Selection (Hourly Master Slot Grouping & 15-Min Slabs)
- **Primary Grouping**: Group active slots by `master_slot_id` (e.g. 10:00 AM - 11:00 AM block).
- **Secondary Selection**: Clicking an hourly block displays its constituent **15-Minute Slabs** (e.g. 10:00–10:15, 10:15–10:30, 10:30–10:45, 10:45–11:00).
- Slots in the past (current date/time comparison) or already booked are automatically disabled (`opacity-40 pointer-events-none`).

---

### Step 3: Digital Payment & Post-Booking Logic

#### 1. Payment Method Selection
Offline / Cash Desk payment has been **removed**. Only digital payments are allowed:
- **Card**: Credit / Debit Card payment portal integration.
- **UPI QR**: Renders official UPI QR asset (`payment_qr.png`).

#### 2. Review & Confirm
- Displays booking summary card (Doctor name, department, formatted date, slot time, patient details, patient type, UHID if existing).
- User clicks **"Confirm & Book Appointment"** -> triggers `POST /api/appointments`.

#### 3. Post-Booking Conditional Handling

##### A. New Patients (`patient_type === 'new'`)
1. Show success checkmark modal.
2. Render **3-Second Animated Stopwatch Countdown**:
   - Stopwatch badge displaying `3` -> `2` -> `1` seconds.
   - Smooth progress bar filling `100%` -> `0%`.
3. Auto-redirect user to Nemcare Pre-Registration portal:
   ```javascript
   window.location.replace('https://preregistration.nemcare.com');
   ```
4. Include manual fallback button: `"Redirect Now"`.

##### B. Existing Patients (`patient_type === 'existing'`)
1. Show success checkmark modal.
2. Render **Confirmation Card**:
   - Displays registered UHID Number (e.g. `UHID123456`).
   - Clear message stating: *"Pre-registration is not required for existing UHID holders."*
3. Render `"Done & Close"` button to reset the modal without any web redirect.

---

## UI Stepper Visual Guidelines (Continuous Connector Line)

To ensure the progress bar line touches the step circles with no distributed spacing gaps:

1. Use a relative container with an absolute line behind the circles:
   ```html
   <div className="relative flex items-center justify-between pb-8 w-full px-6">
     <!-- Background line -->
     <div className="absolute top-[14px] left-[40px] right-[40px] h-0.5 bg-slate-200 -z-0" />
     <!-- Active filled line -->
     <div 
       className="absolute top-[14px] left-[40px] h-0.5 bg-emerald-500 transition-all duration-300 -z-0"
       style={{ right: bookingStep === 1 ? 'calc(100% - 40px)' : bookingStep === 2 ? '50%' : '40px' }}
     />
     <!-- Step 1, 2, 3 Circles -->
   </div>
   ```
2. Avoid `justify-between` gap utilities (`gap-1.5`) directly on flex containers wrapping line elements, as browser auto-spacing creates unwanted gaps.
