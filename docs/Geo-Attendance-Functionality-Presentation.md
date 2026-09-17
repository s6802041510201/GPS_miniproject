# Geo-Attendance

## Complete Functionality and Presentation Guide

**Project type:** GPS-based classroom attendance system  
**Target users:** Students and Teachers  
**Platform:** Expo React Native mobile application with an Express REST API  
**Language:** English  
**Application purpose:** Verify that a student is physically near the assigned classroom before recording attendance.

---

## 1. Project Overview

Geo-Attendance is a location-aware attendance application designed for university classrooms. It connects the student mobile application, teacher management tools, GPS validation, classroom settings, class sessions, and attendance records through one backend database.

The system has two role-based experiences:

- **Student:** View enrolled courses, see currently available sessions, check in using GPS, and review attendance history.
- **Teacher:** Manage courses and classrooms, create and control class sessions, monitor student attendance, view analytics, and maintain classroom GPS settings.

The main objective is to replace manual attendance with a controlled and auditable check-in process.

---

## 2. System Architecture

```text
Student / Teacher Mobile App
            |
            | HTTPS or local network REST API
            v
       Express Backend
            |
            v
       SQLite Database
```

### Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Mobile | Expo SDK 57, React Native, TypeScript | User interface, navigation, GPS permission, location preview |
| Location | `expo-location` | Read the device's current latitude, longitude, and accuracy |
| Native maps | `react-native-maps` | Display classroom and student locations on native devices |
| Backend | Node.js and Express 5 | Authentication, business rules, API, geofence verification |
| Database | SQLite with `better-sqlite3` | Users, courses, classrooms, sessions, enrollments, attendance |
| Security | `scrypt`, SHA-256 access-token hashes | Password and token protection |
| Presentation UI | React Native styles and reusable components | Blue visual system, responsive cards, buttons, icons, and feedback states |

### Main project folders

```text
Geo-Attendance/
├── mobile/       # Expo mobile application
├── server/       # Express API and SQLite database
├── docs/         # English documentation and presentation materials
└── README.md
```

---

## 3. Authentication and Role Control

### Student authentication

1. The student opens the application.
2. The student selects **Student**.
3. The student enters a student ID and password.
4. The backend verifies the password hash.
5. The backend returns a short-lived bearer access token.
6. The mobile app stores the token securely on native devices.
7. The student is taken to the Student Home screen.

New students can use the registration flow to create a student account with:

- Student ID
- Full name
- Email
- Password

### Teacher authentication

1. The teacher selects **Teacher**.
2. The teacher enters a teacher ID and password.
3. The backend verifies the account and role.
4. The teacher is taken to the Teacher Dashboard.

Teachers are provisioned by an administrator or server-side account-management script. The production design does not depend on hard-coded demo credentials.

### Authorization

Every protected request includes:

```text
Authorization: Bearer <access-token>
```

The backend checks:

- Whether the token is valid and has not expired.
- Whether the user has the required role.
- Whether the student owns the requested student data.
- Whether the teacher owns the requested course or session.

The mobile client cannot grant itself attendance or access another user's records.

---

## 4. Student Features

### 4.1 Student Home

The Student Home screen displays:

- Student name and student ID.
- Enrolled courses.
- Today's available sessions.
- Course name and course code.
- Building and classroom.
- Class start and end time.
- Check-in opening and closing time.
- Current session state.
- A clear action to open the course detail or check-in screen.

Completed, missed, or cancelled sessions are separated from new check-in opportunities so that the home screen focuses on the student's next action.

The app refreshes student course and session data periodically while the student is logged in. This allows a teacher's session status change to appear on the student's device without requiring a full logout and login.

### 4.2 Course Detail and Map Check-in

Before check-in, the student can review:

- Course and classroom identity.
- Classroom GPS coordinate.
- Allowed geofence radius.
- Current device position.
- Estimated distance from the classroom.
- GPS accuracy.
- Whether the student is inside or outside the allowed area.

The screen includes **Refresh location** so the student can manually request a fresh GPS reading when the device is slow or the previous reading is stale.

### 4.3 GPS permission and location checks

Before sending attendance, the app checks:

1. Foreground location permission is granted.
2. Location Services/GPS is enabled.
3. A high-accuracy location reading is available.
4. The reported GPS accuracy is within the configured limit.
5. The device is inside the classroom radius.

The user receives clear messages for denied permission, disabled GPS, low accuracy, stale readings, and outside-area readings.

### 4.4 Check-in process

```text
Tap Check in
      ↓
Request location permission
      ↓
Read current GPS position
      ↓
Validate accuracy and session state
      ↓
Send coordinates to backend
      ↓
Backend recalculates distance and validates rules
      ↓
Save Present or Late attendance
```

The backend validates the following before creating an attendance record:

- The authenticated user is the student being recorded.
- The student is enrolled in the course.
- The classroom matches the course or teacher-controlled session.
- The session exists for the current date.
- A teacher-controlled session is open when required.
- The current time is inside the check-in window.
- GPS accuracy is acceptable.
- Server-calculated distance is within the allowed radius.
- The student has not already checked in for that course and date.

### 4.5 Attendance status

- **Present:** The student checks in on time and passes GPS validation.
- **Late:** The student checks in after the on-time deadline but before the closing time.
- **Absent:** No attendance record exists for a completed or closed session.
- **Cancelled:** The teacher cancelled the session; students cannot check in.

The student cannot submit a custom status from the mobile app.

### 4.6 Attendance History

The history screen provides:

- All attendance records.
- Present, Late, Absent, and Cancelled filters.
- Date selection.
- Course and classroom details.
- Check-in time.
- Attendance status.
- Manual refresh.

The history is loaded from the backend, so it reflects the records used by the teacher dashboard.

### 4.7 Student Profile

The Profile screen shows the authenticated student's account information and provides logout functionality.

---

## 5. Teacher Features

### 5.1 Teacher Dashboard

The dashboard displays data for the selected teacher-owned course and selected date:

- Total enrolled students.
- Present count.
- Late count.
- Absent count.
- Attendance rate.
- Student-by-student attendance list.
- Course, classroom, and schedule information.

The dashboard supports course selection, date selection, and refresh. It is calculated from database enrollments and attendance records rather than static screen values.

### 5.2 Teacher Students

The Students screen provides a detailed list of enrolled students with:

- Student ID.
- Student name.
- Attendance status.
- Check-in time when available.
- Attendance source when the record was manually corrected.

This screen is intended for quickly checking who is Present, Late, or Absent.

### 5.3 Attendance Analytics

The Analytics screen presents:

- Attendance rate percentage.
- Visual progress indicator.
- Total students.
- Present, Late, and Absent metrics.
- Status-distribution chart.
- Selected attendance date.

Attendance rate is calculated as:

```text
(Present + Late) / Total enrolled students × 100
```

### 5.4 Classroom Management / Room Settings

Teachers can:

- View saved classrooms.
- Create a classroom.
- Edit room name, latitude, longitude, and radius.
- Refresh classroom data.
- Delete an unused classroom after confirmation.

The system prevents deletion when the classroom is linked to courses, schedules, sessions, or attendance history. This protects historical data and prevents broken references.

When a classroom is updated, the app reloads the teacher data graph so linked course cards, sessions, dashboard data, analytics, and map previews use the current room information.

### 5.5 Teacher-controlled Sessions

Teachers can create a specific class meeting without editing database rows manually. The form uses selectable date, time, and radius controls to reduce input errors. A session contains:

- Course.
- Classroom.
- Session date.
- Class start time.
- Class end time.
- Check-in opening time.
- Check-in closing time.
- GPS radius.

Session lifecycle:

```text
SCHEDULED ──> OPEN ──> CLOSED
     └──────> CANCELLED
```

#### Session states

- **Scheduled:** Created but not yet opened. Student check-in is unavailable.
- **Open:** Students may check in if they pass time, enrollment, GPS, and classroom validation.
- **Closed:** Check-in is no longer accepted.
- **Cancelled:** The session is cancelled and cannot accept attendance.

#### Teacher session actions

- Create a session.
- Edit a scheduled session.
- Open check-in.
- Close check-in with confirmation.
- Cancel a session with confirmation.
- View session history and linked attendance.
- Delete an unused session when permitted by the current rules.

### 5.6 Attendance Correction

When a student cannot check in because of a GPS issue, device problem, or another verified classroom situation, the teacher can open a session's attendance history and apply a manual correction.

The teacher can:

- View every enrolled student in the selected session.
- Change a student's status to **Present** or **Late**.
- Add a correction reason or note.
- Save the correction to the shared database.
- See the correction source as **Manual correction**.

Manual corrections record the correcting teacher and correction timestamp. The correction is reflected in the teacher Dashboard, Students, Analytics, and student Attendance History. The feature does not allow a teacher to create an arbitrary student record; the student must be enrolled in the session's course.

Opened, closed, and cancelled sessions are protected from ordinary edits so that attendance records remain auditable. A configured grace period can allow controlled correction after closure when enabled.

### 5.7 Teacher Settings

The Settings area is the teacher navigation entry point for application and account-related teacher tools. Navigation is role-specific and uses the same consistent visual system as the other teacher screens.

---

## 6. GPS and Geofencing Logic

### Haversine distance

The backend calculates the distance between:

- The classroom coordinate stored in the database.
- The student's submitted GPS coordinate.

The Haversine formula is used to calculate the real-world distance in meters. The client may show a preview, but the backend is authoritative.

```text
If server distance ≤ allowed radius:
    GPS condition passes
Else:
    Check-in is rejected as OUTSIDE_GEOFENCE
```

### GPS accuracy

The system also checks the device-reported accuracy. The limit is configurable through environment variables. The current indoor/floor-level presentation configuration uses a more tolerant limit than the original strict setting, while the classroom radius check remains active.

### Building references

The project contains mapped classroom references for KMUTNB Bangkok:

| Building | Example room | Latitude | Longitude | Radius |
|---|---|---:|---:|---:|
| 44 | Room 4401 / Room 702 label | 13.81972 | 100.51553 | 50 m |
| 52 | Room 5201 / Room 211 label | 13.82039 | 100.51512 | 50 m |

These are building-level reference points. They must be field-verified at the actual classroom entrance before production enforcement.

### Map behavior

- Native devices use `react-native-maps`.
- Android is configured for the Google map provider when the native API key is available.
- The current iOS implementation uses the platform map provider unless the iOS Google provider configuration is explicitly enabled.
- Web uses a designed campus-map preview with classroom and student markers so the application remains presentable without a native map provider.

---

## 7. Data Model

The database separates operational data into the following entities:

```text
Users
 ├── Students
 └── Teachers

Buildings ──> Classrooms ──> Courses ──> Class Schedules
                                  │
                                  ├── Class Sessions
                                  └── Enrollments ──> Attendance
```

### Main tables

| Table | Purpose |
|---|---|
| `users` | Authenticated student and teacher accounts |
| `buildings` | Building identity and location references |
| `classrooms` | Room name, room number, GPS coordinate, radius, and capacity |
| `courses` | Course code, course name, teacher, and linked classroom |
| `class_schedules` | Weekly day, class time, and check-in timing rules |
| `class_sessions` | Teacher-created class meetings and lifecycle status |
| `enrollments` | Student-to-course relationships |
| `attendance` | Check-in time, coordinates, accuracy, distance, status, and source |
| `sessions` | Hashed authentication tokens and expiration |

### Integrity controls

- Foreign keys are enabled.
- Duplicate attendance for the same student, course, and date is blocked.
- Classroom references are protected while they are in use.
- Session and course ownership is checked by the backend.
- Passwords are salted and hashed with `scrypt`.
- Access tokens are stored as SHA-256 hashes.

---

## 8. Main API

### Authentication and health

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/users/me
GET  /api/health
```

### Student operations

```text
GET  /api/courses?studentId=:studentId
GET  /api/attendance/student/:studentId
POST /api/attendance/check-in
```

### Teacher operations

```text
GET  /api/teacher/courses?teacherId=:teacherId
GET  /api/teacher/sessions?teacherId=:teacherId
POST /api/teacher/sessions
PUT  /api/teacher/sessions/:id
POST /api/teacher/sessions/:id/open
POST /api/teacher/sessions/:id/close
POST /api/teacher/sessions/:id/cancel
PATCH /api/teacher/sessions/:id/attendance/:studentId
GET  /api/dashboard?courseId=:courseId&date=YYYY-MM-DD
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/:id
DELETE /api/classrooms/:id
```

---

## 9. Synchronization Between Student and Teacher

The teacher and student applications do not use separate attendance data. Both read the same backend database.

Example flow:

```text
Teacher creates a session
        ↓
Teacher opens check-in
        ↓
Student app refreshes session data
        ↓
Student sees the same course, building, room, and status
        ↓
Student checks in
        ↓
Backend saves the attendance record
        ↓
Teacher refreshes Dashboard / Students / Analytics
        ↓
Teacher sees the student's updated status
```

The session classroom is authoritative. Therefore, if a teacher opens a session in Building 44, the student's active check-in information must use that session's Building 44 classroom and radius.

---

## 10. User Feedback and Error Handling

The app displays user-friendly feedback for common conditions:

| Condition | Result shown to the user |
|---|---|
| Invalid login | Authentication error |
| Location permission denied | Request to allow location access |
| GPS disabled | Request to enable Location Services |
| GPS accuracy too low | Accuracy value and retry guidance |
| Outside classroom radius | Distance, allowed radius, and rejection message |
| Session not opened | Teacher must open the session first |
| Session closed | Check-in is no longer available |
| Session cancelled | Session cannot accept attendance |
| Duplicate check-in | Existing check-in is preserved |
| Classroom in use | Delete is blocked with linked-record information |
| Network/API failure | Retry message and refresh action |

Loading states, empty states, error messages, confirmations, and success messages are implemented across the main screens.

---

## 11. Presentation Demonstration Script

### Part A: Student flow

1. Open the app and show the welcome/login screen.
2. Sign in as a student.
3. Show today's courses and session details.
4. Open a course detail screen.
5. Show the classroom map preview, GPS accuracy, distance, and allowed radius.
6. Tap **Refresh location**.
7. Tap **Check in**.
8. Show the success or validation result.
9. Open **Attendance history** and show the saved record.
10. Explain that a second check-in is rejected as a duplicate.

### Part B: Teacher flow

1. Log out and sign in as a teacher.
2. Select a course on the dashboard.
3. Select an attendance date.
4. Open **Sessions** and create or select a class session.
5. Confirm the course, date, classroom, class time, and check-in window.
6. Open check-in.
7. Return to the student device and refresh or wait for synchronization.
8. Show that the student now sees the same active classroom and session.
9. Complete student check-in.
10. Return to the teacher Dashboard, Students, and Analytics screens.
11. Refresh and show the updated Present/Late count and attendance rate.

### Part C: Room Settings flow

1. Open **Classroom management**.
2. Select a saved room and tap **Edit**.
3. Change the classroom radius or coordinate.
4. Save the room.
5. Show the linked room data after refresh.
6. Try to delete a classroom that is in use and show the protection message.
7. Create and delete an unused test classroom to demonstrate the complete lifecycle.

### Suggested explanation

> “The key design principle is that the client only collects evidence. The backend makes the final attendance decision using the authenticated student, the selected session, the enrolled course, the classroom, the time window, GPS accuracy, and the server-calculated distance.”

---

## 12. Verification and Quality Status

The repository includes automated tests for:

- Password hashing and password verification.
- Access-token creation and invalidation.
- Student and teacher authentication.
- Role and ownership authorization.
- Haversine distance calculation.
- Geofence inside, boundary, and outside behavior.
- Coordinate, radius, and accuracy validation.
- Duplicate check-in protection.
- Session creation, opening, closing, and cancellation.
- Student check-in gating by teacher-controlled session state.
- Room deletion protection.
- Room Settings propagation to linked session and student data.

The current project checks also include TypeScript compilation and Expo web export verification. Native physical-device testing, production backend deployment, HTTPS, and final field coordinate verification remain required before claiming full production readiness.

---

## 13. Current Limitations and Required Next Steps

### Limitations to state during presentation

- GPS is not a complete anti-cheating solution and GPS spoofing detection is not implemented.
- Classroom coordinates are building-level references and require field verification.
- Indoor GPS accuracy may vary by phone, building, floor, and surrounding structures.
- A local SQLite backend is suitable for demonstration and controlled testing, but production requires hosted infrastructure.
- Production requires HTTPS, secret management, database backups, monitoring, rate limiting, and a deployment plan.
- iOS native Preview Build requires an active Apple Developer Program membership.
- Google Maps native configuration must be verified separately for each platform and build profile.

### Recommended next steps

1. Field-verify Building 44 and Building 52 coordinates at the actual classroom entrances.
2. Deploy the backend to a stable HTTPS host.
3. Configure production secrets and database backups.
4. Test the Android Preview Build on a real device.
5. Activate Apple Developer membership and create an iOS Preview Build.
6. Run the full student-teacher scenario on two physical devices.
7. Record final test evidence and prepare screenshots for the presentation.

---

## 14. Final Presentation Summary

Geo-Attendance is a functional end-to-end attendance prototype with:

- Role-based Student and Teacher applications.
- Real backend authentication and authorization.
- Teacher-controlled class sessions.
- GPS permission and geofence validation.
- Server-side distance verification.
- Duplicate attendance protection.
- Shared student-teacher data flow.
- Classroom settings and protected deletion.
- Attendance history and teacher analytics.
- Presentation-ready UI with clear actions, feedback, and responsive layouts.

The system is ready for a controlled presentation and functional demonstration. Production release still depends on field GPS verification, hosted HTTPS backend deployment, real-device testing, and platform signing requirements.
