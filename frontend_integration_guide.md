# Frontend Integration Flow Guide: Hospital Booking System

This guide outlines the logical flow, endpoints, request payloads, and query parameters needed to connect your React admin panel to the hospital appointment system.

---

## Flow 1: Department & Doctor Management

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

### 2. List Departments (For selection lists or tables)
* **Endpoint**: `GET /api/departments`
* **Response structure**:
  - `data`: Array of objects `[{ id, name, description }]`

### 3. Add Doctor (Updated)
* **Action**: Admin enters doctor details and optionally selects their available time slots.
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
    "slot_ids": [1, 2, 3, 4]                            // Optional: array of master slot IDs to assign
  }
  ```

### 4. Edit Doctor Profile
* **Action**: Update a doctor's profile fields.
* **Endpoint**: `PUT /api/doctors/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "name": "Dr. Biswajit Deuri (Updated)",
    "designation": "Head Consultant",
    "experience_years": "18+ Years",
    "bio": "Updated biography here...",
    "contact_email": "newemail@gmail.com"
    // (You can send any or all fields from the Add Doctor payload to update them)
  }
  ```

### 5. Assign/Edit Doctor Slots Separately
* **Action**: Admin updates the doctor's weekly active slots schedule.
* **Endpoint**: `POST /api/doctors/:id/slots`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "slot_ids": [1, 2, 5, 8] // Complete list of slot IDs that this doctor works
  }
  ```

### 6. Delete Doctor Profile
* **Action**: Remove a doctor from the system.
* **Endpoint**: `DELETE /api/doctors/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Note**: This request will fail with `400 Bad Request` if the doctor has active, upcoming appointments. The Admin must cancel/reschedule those appointments before deleting the doctor.

---

## Flow 2: Time Slots Configuration (Master Slots)

### 1. Add Master Time Slot
* **Action**: Configure the operating slots of the hospital (e.g., 15-minute windows).
* **Endpoint**: `POST /api/slots`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "start_time": "10:00", // Format: HH:MM (24-hour)
    "end_time": "10:15"   // Format: HH:MM (24-hour)
  }
  ```

### 2. View All Master Slots
* **Endpoint**: `GET /api/slots`
* **Response structure**:
  - `data`: Array of objects `[{ id, start_time, end_time }]`

### 3. Update Master Time Slot
* **Action**: Edit the start and end times of an existing master slot.
* **Endpoint**: `PUT /api/slots/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "start_time": "10:30", // Format: HH:MM (24-hour)
    "end_time": "10:45"   // Format: HH:MM (24-hour)
  }
  ```

### 4. Delete Master Time Slot
* **Action**: Delete an existing master slot.
* **Endpoint**: `DELETE /api/slots/:id`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## Flow 3: Managing Availability (Doctor Override Calendar)

### 1. Retrieve Dynamic Availability Status
* **Action**: Admin selects a **Doctor** from a dropdown and a **Date** from a date picker.
* **Endpoint**: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
* **Updated Behavior**: This endpoint now **only returns time slots that are actively assigned to this doctor** by the admin, instead of returning all master slots.
* **Response structure**:
  - `data`:
    ```json
    {
      "doctor": { "id": 1, "name": "Dr. Sarah Connor" },
      "date": "2026-06-15",
      "slots": [
        {
          "id": 1,
          "start_time": "10:00",
          "end_time": "10:15",
          "is_booked": false,
          "is_manually_disabled": false,
          "available": true
        }
      ]
    }
    ```
* **UI Rule**: Display these slots as chips/cards. Color them green if `available` is true, grey/blue if `is_booked` is true, and red if `is_manually_disabled` is true.

### 2. Toggle Availability (Manual Disable/Enable)
* **Action**: Admin clicks on a slot to toggle its availability (cannot toggle slots where `is_booked` is true).
* **Endpoint**: `POST /api/doctors/:id/slots/toggle`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "slot_id": 1,
    "date": "2026-06-15",
    "is_disabled": true // Send true to disable, false to enable
  }
  ```
* **Follow-up**: After a successful toggle, trigger a re-fetch of the doctor slots endpoint (`GET /api/doctors/:id/slots?date=YYYY-MM-DD`) to refresh the calendar UI.

### 3. Make Doctor Unavailable for the Day
* **Action**: Disables all slots for a doctor on a specific date.
* **Endpoint**: `POST /api/doctors/:id/unavailable`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "date": "2026-06-15"
  }
  ```

### 4. Make Doctor Available for the Day
* **Action**: Resets all slot overrides for a doctor on a specific date (re-enabling all slots to default).
* **Endpoint**: `POST /api/doctors/:id/available`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "date": "2026-06-15"
  }
  ```


---

## Flow 4: Appointment Booking & Dashboard

### 1. Booking a Slot
* **Action**: Patient or Admin books an available slot.
* **Endpoint**: `POST /api/appointments`
* **Payload**:
  ```json
  {
    "doctor_id": 1,
    "slot_id": 1,
    "date": "2026-06-15",
    "patient_name": "John Doe",
    "patient_email": "john@example.com", // Optional
    "patient_phone": "1234567890"        // Optional
  }
  ```

### 2. List All Bookings (Admin Panel Table)
* **Endpoint**: `GET /api/appointments`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Response structure**:
  - `data`: Array of booked objects, including doctor name, department name, start time, end time, patient name, and `status` (`'booked'` or `'cancelled'`).

### 3. Cancel Appointment
* **Action**: Click "Cancel" next to a booking in the appointments list.
* **Endpoint**: `PUT /api/appointments/:id/cancel`
* **Response**: Sets the status to `'cancelled'`, which releases the slot for booking again.
