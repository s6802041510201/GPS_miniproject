# Geo-Attendance Current Application Status

**Audit date:** 2026-09-16
**Project:** Geo-Attendance
**Purpose:** GPS-based classroom attendance application for students and teachers.
**Current assessment:** Working local/demo application. Not production-ready until real-device testing, coordinate verification, and backend deployment are completed.

## Executive Summary

Geo-Attendance is an Expo React Native mobile application with an Express and SQLite backend. The system supports Student and Teacher roles, GPS-based classroom geofencing, attendance recording, teacher dashboards, classroom settings, and teacher-controlled class sessions.

The current implementation has passed the automated backend suite, TypeScript compilation, Expo validation, and web export. Android and iPhone field testing, EAS builds, HTTPS deployment, and authoritative KMUTNB coordinate verification are still pending.

## Current Status by Area

| Area | Status | Evidence or limitation |
|---|---|---|
| Mobile application | Working | TypeScript compilation and web export passed |
| Backend API | Working | 15 automated tests passed |
| SQLite database | Working | Schema, foreign keys, indexes, and seed data are active |
| Student authentication | Working | Student ID and password login tested |
| Teacher authentication | Working | Teacher ID and password login tested |
| Authorization | Working | Role and ownership tests passed |
| GPS and geofencing | Working | Haversine, boundary, accuracy, and backend validation tested |
| Student check-in | Working | Enrollment, session, GPS, duplicate, and status checks are enforced |
| Teacher dashboard | Working | Statistics are calculated from database records |
| Teacher-controlled sessions | Working | Create, edit, open, close, cancel, and student validation implemented |
| Room Settings propagation | Working | Course, dashboard, analytics, and map data refresh after saving |
| Android physical-device testing | Not verified | Requires a connected device or emulator |
| iPhone physical-device testing | Not verified | Requires iOS tooling or EAS build |
| Production deployment | Not configured | Backend hosting, HTTPS, secrets, backups, and monitoring are pending |
| Real KMUTNB coordinate verification | Unverified | Current coordinates came from the project brief |
| GPS spoofing detection | Not implemented | The system does not claim to detect spoofing |

## Technology Stack

### Mobile

- Expo SDK 57
- React Native 0.86
- TypeScript
- `expo-location`
- `expo-secure-store`
- `react-native-maps`
- `react-native-reanimated`
- React Native Web

### Backend

- Node.js
- Express 5
- SQLite
- `better-sqlite3`
- `dotenv`
- `cors`

### Project structure

```text
Geo-Attendance/
├── mobile/       # Expo React Native application
├── server/       # Express REST API and SQLite database
├── docs/         # English project documentation
├── README.md
└── Geo-Attendance-System-Status.md
```

## Implemented Student Features

- Student ID and password login.
- Student home screen.
- Today's Sessions and next-session information.
- Course, building, classroom, schedule, and GPS radius display.
- Check-in open, on-time, late, and close-window display.
- Foreground location permission request.
- Location Services availability check.
- High-accuracy location request.
- GPS accuracy validation.
- Client distance preview.
- Backend Haversine distance validation.
- Backend geofence validation.
- Enrollment validation.
- Classroom and session validation.
- Duplicate check-in protection.
- Attendance history.
- Course details and map preview.
- Student profile.
- Logout.
- Persisted native authentication token through SecureStore.
- Session restoration through `GET /api/users/me`.

## Implemented Teacher Features

- Teacher ID and password login.
- Teacher dashboard.
- Multiple-course selection.
- Course, building, classroom, schedule, and GPS radius display.
- Present, Late, Absent, and total student statistics.
- Attendance rate calculation from database records.
- Student attendance list.
- Attendance analytics screen.
- Classroom and Room Settings screen.
- Classroom coordinate and radius editing.
- Linked data refresh after Room Settings changes.
- Classroom map preview.
- Teacher-controlled Session management.
- Teacher logout.

## Teacher-Controlled Session Management

Authentication tokens remain in the existing `sessions` table. Class meetings are stored separately in the `class_sessions` table.

### Session lifecycle

```text
SCHEDULED -> OPEN -> CLOSED
     \-> CANCELLED
```

- `SCHEDULED`: The session exists, but students cannot check in.
- `OPEN`: Enrolled students may check in when they pass GPS validation.
- `CLOSED`: Check-in is no longer available. A teacher-closed session is shown as `Closed by teacher`.
- `CANCELLED`: The session is cancelled and cannot accept attendance.

### Teacher actions

- Create a session.
- Select a course.
- Select a classroom.
- Set the session date.
- Set class start and end time.
- Set check-in opening and closing time.
- Set GPS radius.
- Edit a scheduled session.
- Open check-in.
- Close check-in.
- Cancel a session.

Only the teacher who owns the course can manage its sessions. Opened, closed, and cancelled sessions are locked against editing.

### Student-controlled session validation

For a teacher-controlled session, the backend verifies:

1. The session exists for the current date.
2. The authenticated student is enrolled in the course.
3. The classroom belongs to the session.
4. The session is open.
5. The current time is within the check-in window.
6. GPS accuracy is acceptable.
7. The server-calculated distance is inside the session radius.
8. The student has not already checked in.

The mobile client cannot open a session or bypass the backend decision.

## Current Database Contents

The following values were read from the current local SQLite database during the latest audit.

| Entity | Current count |
|---|---:|
| Students | 0 |
| Teachers | 0 |
| Buildings | 2 |
| Classrooms | 2 |
| Courses | 0 |
| Weekly schedules | 0 |
| Teacher-controlled sessions | 0 |
| Enrollments | 0 |
| Attendance records | 0 |

### Account management

```text
Production: no hard-coded demo accounts
Student: self-registration is available from the mobile sign-in screen
Teacher: provision with server/scripts/create-user.js
```

### Courses

```text
040613101 - Mobile Application
040613102 - Data Structure
```

### Buildings

```text
Building 44
Latitude: 13.81972
Longitude: 100.51553
Radius: 50 m

Building 52
Latitude: 13.82039
Longitude: 100.51512
Radius: 50 m
```

These are verified building-level references and still require field confirmation with a phone before production enforcement. See `docs/KMUTNB-Coordinate-Verification.md`.

### Current classroom mappings

```text
Room 702
Building 44
Room number: 4401
Latitude: 13.81972
Longitude: 100.51553
Radius: 50 m

Room 211
Building 52
Room number: 5201
Latitude: 13.82039
Longitude: 100.51512
Radius: 50 m
```

The legacy unassigned `room 701` record is migrated to the canonical mapped room when it has historical references, or removed when it is unused.

### Current controlled session

```text
Date: 2026-09-16
Class time: 08:30 - 12:00
Check-in opens: 08:00
Check-in closes: 12:15
GPS radius: 50 m
Database status: SCHEDULED
```

Students cannot check in until the teacher selects `Open check-in`.

## Database Schema

The backend separates the following entities:

- `users`
- `buildings`
- `classrooms`
- `courses`
- `class_schedules`
- `class_sessions`
- `enrollments`
- `attendance`
- `sessions` for authentication tokens

### Integrity controls

- SQLite foreign keys are enabled.
- Attendance has a unique constraint on student, course, and session date.
- Classrooms have unique building and room-number protection when mapped.
- Passwords are stored as salted `scrypt` hashes.
- Access tokens are stored as SHA-256 hashes.
- Attendance rows can reference a teacher-controlled session.

## API Endpoints

### Authentication

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
GET  /api/health
```

### Student

```text
GET  /api/courses?studentId=:studentId
GET  /api/attendance/student/:studentId
POST /api/attendance/check-in
```

### Teacher

```text
GET  /api/teacher/courses?teacherId=:teacherId
GET  /api/teacher/sessions?teacherId=:teacherId
POST /api/teacher/sessions
PUT  /api/teacher/sessions/:id
POST /api/teacher/sessions/:id/open
POST /api/teacher/sessions/:id/close
POST /api/teacher/sessions/:id/cancel
GET  /api/dashboard?courseId=:courseId
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/:id
```

Protected routes require:

```text
Authorization: Bearer <access-token>
```

## Security Status

### Working

- Student and Teacher role separation.
- Backend token validation.
- Token expiration.
- Password hashing.
- Student ownership checks.
- Teacher course ownership checks.
- Teacher session ownership checks.
- Backend identity used for attendance writes.
- Backend GPS distance calculation.
- Backend enrollment and classroom checks.
- Database duplicate attendance protection.
- Invalid JSON and database error handling.
- Request timeout handling in the mobile API client.
- CORS configuration through environment variables.

### Not implemented or pending

- GPS spoofing detection.
- Refresh token rotation.
- Rate limiting.
- Production secret manager.
- HTTPS deployment.
- Production backups and monitoring.

## Environment Configuration

### Mobile

Copy `mobile/.env.example` to `mobile/.env`:

```text
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For a physical phone, replace `localhost` with the computer LAN IP or deployed HTTPS API URL.

### Backend

Copy `server/.env.example` to `server/.env`:

```text
PORT=3000
APP_TIMEZONE=Asia/Bangkok
APP_TIMEZONE_OFFSET=+07:00
SESSION_TTL_HOURS=8
CORS_ORIGIN=http://localhost:8081
```

The backend loads `.env` automatically through `dotenv`.

## How to Run

### Backend

```bash
cd server
npm install
npm run dev
```

The API runs at `http://localhost:3000`.

### Mobile

Open another terminal:

```bash
cd mobile
npm install
npx expo start
```

Available commands:

```bash
npm run web
npm run android
npm run ios
```

## Verification Results

### Automated backend tests

```text
PASS 15 tests
FAIL 0
```

Tested areas:

- Password hashing.
- Access-token hashing.
- Authentication.
- Logout invalidation.
- Role authorization.
- Ownership authorization.
- Haversine distance.
- Geofence inside, boundary, and outside behavior.
- Coordinate and radius validation.
- GPS accuracy validation.
- Missing schedule rejection.
- Wrong classroom rejection.
- Duplicate check-in rejection.
- Teacher-controlled session creation.
- Session open and close flow.
- Student check-in gating by teacher session state.

### Build and quality checks

| Check | Result |
|---|---|
| `cd server && npm test` | PASS, 15/15 |
| `cd mobile && npx tsc --noEmit` | PASS |
| `cd mobile && npx expo-doctor` | PASS, 21/21 |
| `cd mobile && npx expo export --platform web` | PASS |
| English-only source and documentation check | PASS |
| ESLint | Not configured |
| Android native build | Not verified |
| iOS native build | Not verified |
| EAS build | Not verified |

## Dependency Audit

- Server audit: 0 vulnerabilities reported.
- Mobile audit: 10 moderate transitive Expo toolchain vulnerabilities reported by npm audit.
- `npm audit fix --force` was not applied because it proposed a breaking Expo downgrade.

## Known Limitations

- Production no longer seeds hard-coded demo accounts.
- Building 44 and 52 references were corrected and documented; field verification remains required.
- GPS spoofing detection is not implemented.
- Physical Android testing is not verified.
- Physical iPhone testing is not verified.
- Native map behavior has not been verified on physical devices.
- Backend deployment and HTTPS are not configured.
- EAS project configuration and signing are not configured.
- Teacher dashboard and attendance history date filters are implemented.
- Teacher attendance correction is implemented with audit source and reason.
- Closed/cancelled session metadata correction is available within the configured grace period.
- Student Map Check-in includes manual GPS refresh.
- Attendance export is not implemented.
- Local databases created with `SEED_DEMO_DATA=false` remove the legacy presentation accounts and unassigned unused classrooms.

## Recommended Next Steps

1. Field-verify Building 44 and Building 52 coordinates on the intended classroom entrances.
2. Provision real teacher accounts and let students register with university credentials.
3. Test Student and Teacher flows on a real Android phone.
4. Test Student and Teacher flows on a real iPhone.
5. Deploy the backend using HTTPS.
6. Configure the production `EXPO_PUBLIC_API_URL`.
7. Configure EAS project, signing, and preview builds.
8. Add attendance export.
9. Add ESLint and CI checks.
10. Review production secrets, HTTPS, backups, and account retention policies.

## Git Status

The latest pushed commit is:

```text
6be5bd1 Prepare Geo-Attendance production readiness
```

The latest Teacher-controlled Session implementation and current documentation changes are currently local, uncommitted, and not yet pushed to GitHub.

## Related Documentation

- [README.md](../README.md)
- [Teacher-Controlled-Sessions.md](Teacher-Controlled-Sessions.md)
- [Geo-Attendance-Debug-Report.md](Geo-Attendance-Debug-Report.md)
- [Production-Readiness-Plan.md](Production-Readiness-Plan.md)
- [Test-Cases.md](Test-Cases.md)
- [User-Manual.md](User-Manual.md)
- [Presentation-Script.md](Presentation-Script.md)
