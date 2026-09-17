# Geo-Attendance Debug and Stabilization Report

**Audit date:** 2026-09-16
**Project:** Geo-Attendance
**Scope:** Mobile Expo application, Express API, SQLite database, authentication, authorization, GPS check-in, teacher dashboard, and production-readiness configuration.

## Project Status

| Area | Status | Evidence |
|---|---|---|
| Mobile application | Working | TypeScript compilation and web export passed |
| Backend API | Working | 13 automated tests passed |
| Authentication | Working | Password hashing, bearer sessions, logout, and persisted native token restore tested |
| Authorization | Working | Role and ownership API tests passed |
| GPS/geofencing | Working | Haversine, boundary, accuracy, classroom mapping, and duplicate checks passed |
| Database integrity | Working | SQLite foreign keys enabled and attendance uniqueness enforced |
| Teacher dashboard | Working | Server-calculated statistics and multi-course selection implemented |
| Room Settings propagation | Working | Linked course data refreshes and restart persistence verified |
| Android device flow | Not verified | Requires a connected device or Android emulator |
| iOS device flow | Not verified | Requires macOS/iOS tooling or a configured EAS build |
| EAS build and deployment | Not verified | No `eas.json` or linked EAS project is configured |
| Real KMUTNB coordinate verification | Not verified | Current coordinates come from the project brief and require confirmation from an authoritative source |

## Architecture Audit

- `mobile/`: Expo SDK 57, React Native, TypeScript, `expo-location`, `expo-secure-store`, and role-based screen rendering.
- `server/`: Express 5 REST API with SQLite through `better-sqlite3`.
- Authentication uses Student ID or Teacher ID plus password.
- Passwords use salted `scrypt` hashes.
- Access tokens are random bearer tokens stored as SHA-256 hashes in the `sessions` table.
- Attendance is linked to the authenticated student, enrollment, course, schedule, classroom, GPS coordinates, and session date.
- Dashboard statistics are calculated from enrollments and attendance rows for the current session date.

## Bugs Found and Fixed

### BUG-001

- **Severity:** P0
- **File:** `server/src/database/database.js`
- **Problem:** Startup seed logic reset classroom coordinates and radius to demo defaults on every backend restart, which could undo Room Settings changes.
- **Root cause:** `ensureClassroom` always wrote latitude, longitude, and radius for an existing classroom.
- **Fix:** Existing classrooms now keep teacher-edited location and radius values while the seed only restores building and room identity metadata.
- **Test used:** Temporarily changed a classroom radius, loaded the database in a fresh Node process, then restored the original value.
- **Result:** PASS. The changed radius remained after a fresh database load.

### BUG-002

- **Severity:** P0
- **File:** `server/src/utils/session.js`, `server/src/app.js`
- **Problem:** A course without a schedule was treated as check-in allowed.
- **Root cause:** Missing schedule data returned `checkInAllowed: true`.
- **Fix:** Missing schedules now return `not_scheduled` with check-in disabled. The API returns `SESSION_NOT_SCHEDULED`.
- **Test used:** API test creates a temporary course without a schedule and attempts check-in.
- **Result:** PASS. The API returns HTTP 409 and does not create attendance.

### BUG-003

- **Severity:** P0
- **File:** `server/src/app.js`, `server/src/utils/validation.js`
- **Problem:** Negative GPS accuracy values were accepted.
- **Root cause:** The previous validation only rejected non-finite values and values greater than 100.
- **Fix:** Accuracy must now be finite and between 0 and 100 meters.
- **Test used:** API check-in with accuracy `-1`.
- **Result:** PASS. The API returns `LOW_ACCURACY`.

### BUG-004

- **Severity:** P0
- **File:** `server/src/app.js`
- **Problem:** Concurrent or repeated check-ins could surface an unhandled SQLite uniqueness error instead of a clear duplicate response.
- **Root cause:** The database constraint existed, but the insert error was not translated into a domain response.
- **Fix:** Unique attendance conflicts now return `DUPLICATE_CHECK_IN` with HTTP 409.
- **Test used:** Two API check-ins for the same temporary course, student, and session date.
- **Result:** PASS. First request succeeds; second request is rejected.

### BUG-005

- **Severity:** P0
- **File:** `server/src/database/database.js`
- **Problem:** SQLite foreign-key enforcement was not explicitly enabled.
- **Root cause:** SQLite does not guarantee foreign-key enforcement unless the connection pragma is enabled.
- **Fix:** `foreign_keys = ON` is enabled immediately after opening the database. Duplicate migration reference updates were also completed before deleting duplicate rows.
- **Test used:** Database startup and the full API test suite.
- **Result:** PASS. The database initializes and all 13 tests pass.

### BUG-006

- **Severity:** P1
- **Files:** `mobile/src/services/api.ts`, `mobile/App.tsx`
- **Problem:** Mobile authentication tokens existed only in memory, so a reload or app restart lost the authenticated session.
- **Root cause:** No persisted token storage or `/api/users/me` restore flow existed.
- **Fix:** Native sessions now use `expo-secure-store`; app startup restores the token and validates it through `/api/users/me`. Invalid sessions are cleared.
- **Test used:** TypeScript compilation, Expo validation, and the authenticated API restore path.
- **Result:** PASS for implementation and static validation. Real device persistence remains NOT VERIFIED.

### BUG-007

- **Severity:** P1
- **Files:** `mobile/App.tsx`, `mobile/src/screens/TeacherDashboardScreen.tsx`
- **Problem:** Teacher Dashboard always displayed the first course, even when the teacher owned multiple courses.
- **Root cause:** Dashboard, Students, and Analytics were all hardcoded to `courses[0]`.
- **Fix:** Added a course selector and shared selected-course state so dashboard, student list, analytics, and refresh operations use the selected course.
- **Test used:** TypeScript compilation and seeded two-course data inspection.
- **Result:** PASS for compilation and data flow. Physical UI interaction remains NOT VERIFIED.

### BUG-008

- **Severity:** P2
- **Files:** `mobile/src/screens/TeacherStudentsScreen.tsx`, `mobile/src/screens/TeacherStatisticsScreen.tsx`
- **Problem:** Loading or API failures could appear as an empty student list or zero-valued analytics.
- **Root cause:** These screens did not receive loading and error state from the app shell.
- **Fix:** Added explicit loading, error, empty, and refresh states.
- **Test used:** TypeScript compilation and web export.
- **Result:** PASS for build validation. Manual visual verification remains NOT VERIFIED.

### BUG-009

- **Severity:** P1
- **Files:** `server/src/app.js`, `mobile/src/services/api.ts`
- **Problem:** Malformed JSON, duplicate resource conflicts, and stalled network requests did not have consistent safe handling.
- **Root cause:** No API error middleware and no client request timeout.
- **Fix:** Added safe JSON/SQLite error responses, configurable CORS origins, and a 15-second mobile request timeout.
- **Test used:** Full API suite, TypeScript compilation, Expo Doctor, and web export.
- **Result:** PASS.

### BUG-010

- **Severity:** P1
- **Files:** `server/src/app.js`, `server/package.json`
- **Problem:** The documented `server/.env` file was not loaded automatically by the backend process.
- **Root cause:** The server had environment examples but no dotenv initialization.
- **Fix:** Added `dotenv` and load it before database and route initialization.
- **Test used:** Backend test startup and full API suite.
- **Result:** PASS.

## Security Review

- **Authentication:** Working. Student and Teacher login use ID plus password. Google Login/OAuth was not added.
- **Password storage:** Working. Passwords are stored as salted `scrypt` hashes; plaintext demo password columns are migrated to empty values.
- **Token/session:** Working. Expiring bearer sessions are stored as one-way token hashes. Native mobile token persistence uses SecureStore.
- **Authorization:** Working. Student-only and teacher-only routes enforce roles. Student resources require the authenticated student ID. Teacher dashboard access checks course ownership.
- **API protection:** Working. Protected routes require a valid token, and backend identity is used for attendance writes.
- **GPS validation:** Working. The backend validates coordinates, accuracy, enrollment, course-to-classroom mapping, schedule, session window, and geofence distance.
- **GPS spoofing:** Not implemented. The system does not claim to detect spoofed GPS.

## GPS and Attendance Review

- Haversine distance calculation: PASS.
- Radius boundary behavior: PASS. Points at or inside the radius are accepted; points outside are rejected.
- Poor accuracy handling: PASS for values below 0 or above the configured 150-meter limit.
- Permission denied and disabled location services: Implemented in mobile code; NOT VERIFIED on a physical device.
- Location unavailable and native timeout behavior: NOT VERIFIED on a physical device.
- Duplicate attendance: PASS through a database uniqueness constraint and API conflict handling.
- Wrong classroom/course mapping: PASS through backend query validation.
- Unenrolled student: PASS by the enrollment query gate; a dedicated negative enrollment fixture is not currently in the automated suite.

## Database Review

- Core entities are separated into users, buildings, classrooms, courses, class schedules, enrollments, sessions, and attendance.
- Foreign-key enforcement is enabled.
- Attendance uniqueness is enforced by `(student_id, course_id, session_date)`.
- Classroom identity uniqueness is enforced for `(building_id, room_number)` when both values exist.
- Room Settings changes persist across backend restart and remain linked to course/schedule references.
- Demo seed data is retained for presentation use.

## Test Results

Command: `cd server && npm test`

```text
PASS 13 tests
FAIL 0
```

Covered areas:

- Password hashing and token hashing.
- Haversine and geofence boundary behavior.
- Coordinate and radius validation.
- Session open, late, closed, not-today, and not-scheduled states.
- Protected routes and missing-token rejection.
- Role enforcement and ownership enforcement.
- Invalid GPS accuracy.
- Wrong classroom mapping.
- No-schedule check-in rejection.
- Duplicate check-in rejection.

Additional build checks:

- `cd mobile && npx tsc --noEmit`: PASS.
- `cd mobile && npx expo-doctor`: PASS, 21/21 checks.
- `cd mobile && npx expo export --platform web`: PASS.
- ESLint: NOT CONFIGURED.
- `npm audit`: Server has 0 vulnerabilities. Mobile reports 10 moderate transitive Expo toolchain vulnerabilities; `npm audit fix --force` would downgrade Expo and was not applied.
- Android native build: NOT VERIFIED.
- iOS native build: NOT VERIFIED.
- EAS build: NOT VERIFIED.

## Configuration and Real-Device Readiness

- Development mobile API URL: `EXPO_PUBLIC_API_URL` in `mobile/.env`.
- Backend port: `PORT` in `server/.env`.
- Session timezone: `APP_TIMEZONE` and `APP_TIMEZONE_OFFSET` in `server/.env`.
- CORS: `CORS_ORIGIN`; multiple origins may be comma-separated.
- A physical iPhone must use the computer LAN IP or deployed HTTPS URL, not `localhost`.
- iOS location permission text is configured through `expo-location`.
- Building 44 and 52 coordinates are currently **UNVERIFIED** because they were supplied by the project brief and were not independently checked against an authoritative KMUTNB source.

## Remaining Issues

- **NOT VERIFIED:** Real iPhone GPS permission, GPS accuracy, location-disabled, offline, and end-to-end check-in behavior.
- **NOT VERIFIED:** Android native build and map rendering on a real device.
- **NOT VERIFIED:** iOS native build and map rendering.
- **NOT VERIFIED:** EAS configuration, signing, preview build, and deployment.
- **UNVERIFIED:** Building 44 and 52 latitude/longitude values.
- **NOT IMPLEMENTED:** GPS spoofing detection.
- **NOT CONFIGURED:** ESLint and a CI pipeline.
- **LIMITATION:** The current teacher UI selects a course, but schedule editing and multi-session date filtering are not yet provided.
- **LIMITATION:** The demo credentials are intentionally simple and must not be used for production.

## Recommended Next Steps

1. Verify Building 44 and 52 coordinates from an authoritative KMUTNB source and record the source in the deployment configuration.
2. Test the student and teacher flows on a real Android device and iPhone.
3. Deploy the backend to HTTPS and configure `EXPO_PUBLIC_API_URL` for a preview build.
4. Add `eas.json`, EAS project linking, signing configuration, and a preview build workflow.
5. Add schedule/session editing, date filters, attendance correction, and CSV export for teacher reports.
6. Add ESLint and CI checks for TypeScript, tests, Expo validation, and web export.
