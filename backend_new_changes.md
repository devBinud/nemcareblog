# Nemcare Hospital Backend Specification — Receptionist Role & Dynamic Availability Changes

This document outlines the backend architectural updates required to support **Role-Based Access Control (RBAC)** for Receptionists and **Dynamic Date-Range Doctor Availability (e.g., 1-Week Schedule Window)**.

---

## 1. Overview & Objectives

1. **Receptionist Role Isolation**:
   * Support a new `receptionist` user role alongside `admin`.
   * Grant receptionists access ONLY to **Appointments** management, **Doctor Availability** toggling/leaves, and viewing doctor/department lists.
   * Restrict access to **Blogs**, **Author management**, **Department creation**, **Doctor profile creation**, and **Master Time Slot configuration**.

2. **Dynamic Schedule Windows (1-Week / Range Availability)**:
   * Allow setting doctor availability by specific start and end dates (`available_from` and `available_to`) rather than showing endless weeks.
   * Restrict appointment booking and slot generation to dates within the doctor's published availability window.

---

## 2. Database Schema Changes

### A. `users` Table Migration
Add a `role` column to the `users` table:

```sql
ALTER TABLE users 
ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'admin';

-- Example User Roles: 'admin', 'receptionist'
```

### B. `doctors` Table Migration (or `doctor_schedule_windows` Table)
Add published availability window fields to doctors or create a dedicated schedule window table:

```sql
-- Option 1: Direct columns on doctors table
ALTER TABLE doctors 
ADD COLUMN available_from DATE NULL,
ADD COLUMN available_to DATE NULL;

-- Option 2 (Recommended for multiple range history): doctor_schedules table
CREATE TABLE doctor_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);
```

---

## 3. Authentication & JWT Response Update

### Login Endpoint (`POST /auth/login` or `POST /users/login`)
When a user logs in, include their `role` in the JWT claims and the user response payload:

#### Response Payload (`200 OK`)
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "id": 12,
      "name": "Front Desk Reception",
      "email": "reception@nemcare.com",
      "role": "receptionist"
    }
  }
}
```

---

## 4. Role-Based Access Control (RBAC) & Endpoint Matrix

Implement authorization middleware (e.g., `verifyRole(['admin', 'receptionist'])`).

| Endpoint Route | HTTP Method | Granted Roles | Action / Notes |
| :--- | :--- | :--- | :--- |
| `/auth/login` | `POST` | Public | Authenticates user & returns role |
| `/appointments` | `GET`, `POST` | `admin`, `receptionist` | View & create appointments |
| `/appointments/:id` | `PUT`, `DELETE` | `admin`, `receptionist` | Update status (complete/cancel) |
| `/departments` | `GET` | `admin`, `receptionist` | View departments list |
| `/departments` | `POST`, `PUT`, `DELETE` | `admin` ONLY | Add/Edit/Delete departments |
| `/doctors` | `GET` | `admin`, `receptionist` | View doctors list |
| `/doctors` | `POST`, `PUT`, `DELETE` | `admin` ONLY | Add/Edit/Delete doctor profiles |
| `/slots` | `GET` | `admin`, `receptionist` | View master slot definitions |
| `/slots` | `POST`, `PUT`, `DELETE` | `admin` ONLY | Modify master time slot templates |
| `/doctors/:id/slots` | `GET` | Public / `admin` / `receptionist` | Get slots for specific date |
| `/doctors/:id/slots/toggle` | `POST` | `admin`, `receptionist` | Manual slot override |
| `/doctors/:id/available` | `POST` | `admin`, `receptionist` | Mark doctor available on date |
| `/doctors/:id/unavailable` | `POST` | `admin`, `receptionist` | Mark doctor on leave for date(s) |
| `/doctors/:id/schedule` | `POST` | `admin`, `receptionist` | Set/publish schedule date range |
| `/blogs` | `*` (All) | `admin` ONLY | Blog post management |
| `/users` | `*` (All) | `admin` ONLY | User & author account management |

---

## 5. Doctor Schedule Window Logic (1-Week Availability)

### A. Slot Query Behavior (`GET /doctors/:id/slots?date=YYYY-MM-DD`)
When fetching slots for a doctor on a specific date:

1. **Check Availability Window**: Verify if `date` is between `available_from` and `available_to` for that doctor.
2. **If Date is Outside Window**:
   Return an empty slots array with an status flag indicating the schedule is not published:
   ```json
   {
     "status": "success",
     "published": false,
     "message": "Doctor schedule is not published for this date.",
     "data": {
       "slots": []
     }
   }
   ```
3. **If Date is Within Window**:
   Proceed with standard slot generation (excluding full day leaves and manual slot overrides).

### B. Publish Schedule Endpoint (`POST /doctors/:id/schedule`)
Allows Admin or Receptionist to set or extend a doctor's active booking window (e.g., 7-day schedule).

#### Request Payload
```json
{
  "start_date": "2026-08-01",
  "end_date": "2026-08-07"
}
```

#### Response Payload (`200 OK`)
```json
{
  "status": "success",
  "message": "Availability schedule published successfully from 2026-08-01 to 2026-08-07."
}
```

---

## 6. Implementation Steps Summary for Backend Developer

1. [ ] Run DB migration to add `role` column to `users` table (`'admin'`, `'receptionist'`).
2. [ ] Add `available_from` and `available_to` columns to `doctors` table (or `doctor_schedules` table).
3. [ ] Update login endpoint to include `user.role` in JWT token and response JSON.
4. [ ] Implement RBAC middleware checking user roles on restricted endpoints (`admin` vs `receptionist`).
5. [ ] Update `GET /doctors/:id/slots` to validate against doctor's `available_from` and `available_to` window.
6. [ ] Create `POST /doctors/:id/schedule` API to let receptionists set doctor schedule date ranges.
