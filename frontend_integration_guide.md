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

### 3. Add Doctor
* **Action**: Admin enters doctor name, designation, and selects a department from a dropdown of retrieved departments.
* **Endpoint**: `POST /api/doctors`
* **Headers**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`
* **Payload**:
  ```json
  {
    "name": "Dr. Sarah Connor",
    "designation": "Senior Cardiologist",
    "department_id": 1
  }
  ```

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

---

## Flow 3: Managing Availability (Doctor Override Calendar)

### 1. Retrieve Dynamic Availability Status
* **Action**: Admin selects a **Doctor** from a dropdown and a **Date** from a date picker.
* **Endpoint**: `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
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
