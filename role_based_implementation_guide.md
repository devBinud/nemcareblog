# Nemcare Hospital — Role-Based Access Control (RBAC) & Dynamic Schedule Guide

## 1. Overview & Architecture

This guide details the completed implementation of **Role-Based Access Control (RBAC)** and **Dynamic Doctor Schedule Windows** for the Nemcare Hospital Backend API. 

The system now supports fine-grained authorization for **Admins** and **Receptionists**, protecting master administrative functions while allowing receptionists to manage daily appointment flows, slot availability toggles, and published doctor schedule windows.

---

## 2. User Roles & Capabilities Matrix

| Feature / Resource | Role: Admin | Role: Receptionist | Role: Public / User |
| :--- | :---: | :---: | :---: |
| **User Login & Profile** | ✅ Full Access | ✅ Full Access | ✅ Public Authentication |
| **Appointments Management** | ✅ Create / Edit / Cancel | ✅ Create / Edit / Cancel | ❌ Read / Book Only |
| **Doctor Availability Schedule** | ✅ Publish Date Windows | ✅ Publish Date Windows | 👁️ View Published Windows |
| **Slot Day Toggles & Leaves** | ✅ Override / Disable | ✅ Override / Disable | 👁️ View Available Slots |
| **Doctor Profiles (Create/Edit)** | ✅ Full Access | 👁️ Read Only | 👁️ Read Only |
| **Department Management** | ✅ Full Access | 👁️ Read Only | 👁️ Read Only |
| **Master Time Slots Definition** | ✅ Full Access | 👁️ Read Only | 👁️ Read Only |
| **Blog & SEO Management** | ✅ Full Access | ❌ Restricted (403) | 👁️ Read Published Blogs |
| **User Account Management** | ✅ Full Access | ❌ Restricted (403) | ❌ Restricted |

---

## 3. Database Schema Updates Executed on Hostinger (`nemcare_db_new`)

The following SQL migrations were successfully executed on the production Hostinger MySQL server:

### A. `users` Table Migration
Updated the `role` column to include the new `'receptionist'` role:
```sql
ALTER TABLE users MODIFY COLUMN role ENUM('user', 'admin', 'receptionist') DEFAULT 'user';
```

### B. `doctors` Table Migration
Added published availability date range fields (`available_from` and `available_to`):
```sql
ALTER TABLE doctors ADD COLUMN available_from DATE DEFAULT NULL;
ALTER TABLE doctors ADD COLUMN available_to DATE DEFAULT NULL;
```

### C. `appointments` Table Verification
Verified and ensured 15-minute slab booking fields are present:
```sql
-- Existing columns verified:
-- slab_start_time VARCHAR(5) DEFAULT NULL
-- slab_end_time   VARCHAR(5) DEFAULT NULL
```

---

## 4. Middleware & Security Implementation

### Authorization Middleware (`middleware/roleMiddleware.js`)
Restricts route access based on authenticated JWT user roles:

```javascript
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied: Action requires one of the following roles: [${allowedRoles.join(', ')}]`,
        403
      );
    }
    return next();
  };
};
```

---

## 5. Endpoints & Route Definitions

### A. Doctor & Availability Routes (`/api/doctors`)

* **`GET /api/doctors`**: View doctor directory *(Public)*
* **`GET /api/doctors/:id/slots?date=YYYY-MM-DD`**: Get 15-minute slab availability for a doctor on a specific date *(Public)*
* **`POST /api/doctors/:id/schedule`**: Publish availability date range (`available_from`, `available_to`) *(Admin & Receptionist)*
* **`POST /api/doctors/:id/slots/toggle`**: Disable/enable individual master time slot on a date *(Admin & Receptionist)*
* **`POST /api/doctors/:id/unavailable`**: Mark doctor on leave for a specific date *(Admin & Receptionist)*
* **`POST /api/doctors/:id/available`**: Remove leave/slot overrides for a doctor on a date *(Admin & Receptionist)*
* **`POST /api/doctors`**: Create new doctor profile *(Admin ONLY)*
* **`PUT /api/doctors/:id`**: Update doctor profile *(Admin ONLY)*
* **`DELETE /api/doctors/:id`**: Delete doctor profile *(Admin ONLY)*
* **`POST /api/doctors/:id/slots`**: Assign master time slots to doctor *(Admin ONLY)*

---

## 6. Verification & Production Deployment Log

1. **Hostinger Database Migration**:
   - `users.role` modified to support `receptionist`.
   - `doctors.available_from` and `doctors.available_to` columns added.
   - `appointments` slab columns confirmed.

2. **Codebase Deployment**:
   - Code updated on Hostinger live environment.

3. **PM2 Application Process Restart**:
   - Executed `pm2 restart all` / `pm2 restart blogbackend`.
   - Log inspection verified clean process execution without runtime errors.
