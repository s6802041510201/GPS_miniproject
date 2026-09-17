# Geo-Attendance Master Development Prompt

## 1. Role and objective

You are the lead software engineer, QA engineer, UX engineer, and technical documentation owner for **Geo-Attendance**.

Continue developing the existing repository. Do not create a new project, replace the architecture, or discard existing user changes. Preserve working behavior while improving reliability, usability, presentation quality, and production readiness.

The product is an English-only mobile attendance application for students and teachers. Conversation with the project owner may be in Thai, but all application UI, source comments, documentation, error messages, test descriptions, and API-facing labels must remain in English.

The primary objective is to provide a credible presentation-ready application that demonstrates a real student/teacher attendance workflow using GPS, geofencing, controlled class sessions, a shared backend, and clear role-based UI.

## 2. Repository and technology

Repository root:

```text
C:\Users\Admin\Desktop\kmutnb\2_1\Geo-Attendance
```

Project structure:

```text
Geo-Attendance/
├── mobile/       # Expo React Native application
├── server/       # Express REST API and SQLite database
├── docs/         # English project documentation
├── README.md
└── Geo-Attendance-Master-Prompt.md
```

Mobile stack:

- Expo SDK 57
- React Native 0.86
- TypeScript
- React Native Web
- `expo-location`
- `expo-secure-store`
- `expo-symbols`
- `react-native-maps`
- `react-native-reanimated`
- `@react-native-community/datetimepicker`

Backend stack:

- Node.js 22.13 or newer
- Express 5
- SQLite with `better-sqlite3`
- `dotenv`
- `cors`

## 3. Product requirements

### Student capabilities

- Sign in with Student ID and password.
- View today's sessions and enrolled courses.
- See course, building, classroom, schedule, check-in window, and allowed radius.
- Request foreground GPS permission.
- Check whether device Location Services are enabled.
- Read the current device location with high accuracy.
- Preview distance to the classroom.
- Check in only when the teacher-controlled session is open, the student is enrolled, GPS accuracy is acceptable, the device is inside the classroom radius, and the student has not already checked in.
- View Present, Late, Closed, Cancelled, Not Today, and unavailable states.
- View attendance history.
- View course location details and classroom map preview.
- View profile and log out.

### Teacher capabilities

- Sign in with Teacher ID and password.
- Select among owned courses.
- View the attendance dashboard for the selected course.
- View Present, Late, Absent, total students, and attendance rate.
- View student attendance records.
- View attendance analytics.
- Create and manage classrooms and GPS radius settings.
- Create, edit, open, close, cancel, delete, and review controlled class sessions.
- Confirm before closing or cancelling an attendance session.
- View session attendance history after a session is closed or cancelled.
- Log out.

## 4. Authentication and authorization

Authentication uses bearer access tokens.

- Passwords are stored as salted `scrypt` hashes.
- Access tokens are stored as SHA-256 hashes in the authentication `sessions` table.
- Tokens expire according to `SESSION_TTL_HOURS`.
- Native mobile tokens are stored with `expo-secure-store`.
- App startup restores the authenticated user through `GET /api/users/me`.
- Students may only access their own student resources.
- Teachers may only access their own courses, sessions, classrooms, and dashboards.
- Never trust a student ID, teacher ID, course ID, or status supplied by the client without server-side ownership validation.
- Never allow the client to submit a fabricated distance, attendance status, or successful check-in state.

## 5. GPS and geofencing rules

GPS and map rendering are separate concerns.

- `expo-location` provides real device location and does not require a Google Maps API key.
- The backend recalculates Haversine distance from the submitted latitude and longitude.
- The backend decides whether the submitted position is inside the classroom radius.
- The current client GPS accuracy limit is 50 meters for the mobile check-in screen and must remain aligned with the server validation policy.
- Boundary behavior is inclusive: a point exactly at the configured radius is accepted.
- GPS spoofing detection is not implemented. Do not claim that the system prevents spoofing 100%.
- Location permission denied, Location Services disabled, poor accuracy, outside geofence, session not open, duplicate attendance, and network failure must have clear user-facing messages.

Current reference coordinates require authoritative university verification before production:

```text
Building 44: latitude 13.8138, longitude 100.5334, radius 50 m
Building 52: latitude 13.8147, longitude 100.5358, radius 50 m
```

Current classroom mapping:

```text
Room 702 -> Building 44 / Room 4401 / 13.8138, 100.5334 / 50 m
Room 211 -> Building 52 / Room 5201 / 13.8147, 100.5358 / 50 m
room 701 -> legacy unassigned room / 13.7777, 100.5888 / 30 m
```

The legacy unassigned room must be removed or assigned before production deployment.

## 6. Map behavior while Google Maps is deferred

Google Maps API setup is intentionally deferred because billing/API-key verification is not complete.

Current behavior:

- Web and non-native fallback map views use `mobile/src/components/MapPreview.tsx`.
- The preview contains a presentation-friendly campus background, roads, buildings, green areas, classroom marker, user marker, radius visualization, and legend.
- The user marker follows the latest real GPS coordinates when available.
- When a real location is not available, the preview displays `Waiting for GPS`.
- The fallback map must not pretend to be an authoritative live map.
- Keep the native `react-native-maps` integration ready for a future Google Maps build.
- Do not add real API keys to source control, documentation, chat, or committed `.env` files.

When Google Maps is resumed, use restricted Android/iOS keys, matching package/bundle identifiers, correct signing SHA-1 values, and a new native build. Do not make Google Maps a prerequisite for GPS calculation or backend geofencing.

## 7. Teacher-controlled session lifecycle

```text
SCHEDULED -> OPEN -> CLOSED
     \\-> CANCELLED
```

- `SCHEDULED`: Created but not open; students cannot check in.
- `OPEN`: Enrolled students may check in after all server GPS/session checks pass.
- `CLOSED`: Check-in is no longer available; read-only attendance history remains available.
- `CANCELLED`: The class session is cancelled and cannot accept attendance.

Session fields:

- Course
- Classroom
- Session date
- Class start time
- Class end time
- Check-in opening time
- Check-in closing time
- GPS radius
- Lifecycle status
- Opened and closed timestamps

Rules:

- Scheduled sessions can be edited.
- Opening, closing, or cancelling requires a confirmation step.
- Opened, closed, and cancelled sessions must not be silently edited.
- Closed/cancelled sessions may be deleted only when no attendance records exist.
- If a correction is needed for a finalized session, create a replacement session rather than modifying the audit record.
- A teacher-controlled session for the current date takes precedence over the weekly schedule.

## 8. Database model

Core entities:

- `users`
- `buildings`
- `classrooms`
- `courses`
- `class_schedules`
- `class_sessions`
- `enrollments`
- `attendance`
- `sessions` for authentication tokens

Integrity rules:

- SQLite foreign keys remain enabled.
- Attendance must prevent duplicate records for the same student, course, and date/session.
- Classroom/building room mappings must remain consistent.
- Attendance may reference `class_sessions.id`.
- Do not reset or overwrite user-edited classroom coordinates during server startup.
- Do not remove existing attendance data during seed or migration work.

Current local presentation data:

```text
Students: 6
Teachers: 1
Buildings: 2
Classrooms: 3
Courses: 2
Weekly schedules: 2
Controlled sessions: 1
Enrollments: 12
Attendance records: 13
```

Presentation access:

```text
Student ID: 65001
Password: 123456

Teacher ID: T001
Password: 123456
```

These credentials are for local presentation/testing only and must be replaced before production deployment.

Courses:

```text
040613101 - Mobile Application
040613102 - Data Structure
```

## 9. API contract

Authentication:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
GET  /api/health
```

Student:

```text
GET  /api/courses?studentId=:studentId
GET  /api/attendance/student/:studentId
POST /api/attendance/check-in
```

Teacher:

```text
GET    /api/teacher/courses?teacherId=:teacherId
GET    /api/teacher/sessions?teacherId=:teacherId
GET    /api/teacher/sessions/:id/attendance
POST   /api/teacher/sessions
PUT    /api/teacher/sessions/:id
POST   /api/teacher/sessions/:id/open
POST   /api/teacher/sessions/:id/close
POST   /api/teacher/sessions/:id/cancel
DELETE /api/teacher/sessions/:id
GET    /api/dashboard?courseId=:courseId
GET    /api/classrooms
POST   /api/classrooms
PUT    /api/classrooms/:id
```

Protected endpoints require:

```text
Authorization: Bearer <access-token>
```

API errors must use stable, readable error codes/messages. The mobile client must show a useful recovery action rather than a silent failure.

## 10. UI/UX requirements

The mobile UI is English-only and follows a modern blue visual system.

Design principles:

- Make the primary action obvious.
- Use high-contrast text and accessible touch targets.
- Keep labels explicit; never rely on an icon alone when an action is consequential.
- Use semantic icons: home, dashboard, rooms, sessions, students, analytics, settings, refresh, location, edit, delete, save, history, profile, logout, and close.
- Use native icon conventions through `expo-symbols`.
- Keep refresh controls as refresh icons with accessible labels.
- Use pressed and disabled states on every interactive control.
- Keep destructive actions red and require confirmation.
- Keep selected navigation labels readable against their background.
- Avoid emoji as functional icons.
- Avoid fake map claims; label fallback maps clearly when necessary.
- Keep forms keyboard-friendly and use picker controls for dates, times, and numeric values where possible.
- Preserve loading, error, empty, and content states.

Important screens:

Student:

- Login
- Student Home
- Map Check-in
- Attendance History
- Profile

Teacher:

- Login
- Attendance Dashboard
- Session Management
- Student Attendance
- Classroom/Room Settings
- Analytics
- Settings

## 11. Current reusable UI components

Important shared components:

- `mobile/src/components/AppIcon.tsx`
- `mobile/src/components/PrimaryButton.tsx`
- `mobile/src/components/IconButton.tsx`
- `mobile/src/components/ScreenHeader.tsx`
- `mobile/src/components/NavigationBar.tsx`
- `mobile/src/components/AnimatedSurface.tsx`
- `mobile/src/components/DecorativeBackdrop.tsx`
- `mobile/src/components/LocationMap.tsx`
- `mobile/src/components/LocationMap.web.tsx`
- `mobile/src/components/LocationMap.native.tsx`
- `mobile/src/components/MapPreview.tsx`
- `mobile/src/theme/index.ts`

When a repeated visual value or behavior is changed, update the shared component/theme instead of adding a one-off screen-specific workaround.

## 12. Environment and run commands

Backend setup on Windows PowerShell:

```powershell
cd C:\Users\Admin\Desktop\kmutnb\2_1\Geo-Attendance\server
npm install
Copy-Item .env.example .env
npm run dev
```

The backend normally runs on `http://localhost:3000`.

Mobile setup:

```powershell
cd C:\Users\Admin\Desktop\kmutnb\2_1\Geo-Attendance\mobile
npm install
Copy-Item .env.example .env
npx expo start --lan --port 8082
```

For Expo Go on a physical iPhone, set the mobile environment variable to the computer's LAN IP, not `localhost`:

```text
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

The phone and computer must be on the same network, and Windows Firewall must allow the backend and Metro ports.

Expo Go does not require `eas init`. EAS linking is only required for EAS services such as cloud builds, signing, or EAS Update.

## 13. EAS and Google Maps status

EAS configuration files exist:

- `mobile/eas.json`
- `mobile/app.config.js`
- `mobile/.env.example`
- `docs/Google-Maps-Setup.md`

Development and production native builds remain pending until the owner completes Expo/EAS account setup and, if needed, Google Cloud billing/API-key setup.

Never paste API keys into chat. Use local `.env` files or EAS sensitive environment variables.

## 14. Required verification after every change

Run:

```powershell
cd mobile
npx tsc --noEmit
npx expo export --platform web

cd ..\server
npm test
```

Also run:

```powershell
cd ..
git diff --check
```

Current automated verification baseline:

- TypeScript: PASS
- Expo web export: PASS
- Backend tests: PASS, 19/19
- Git diff check: PASS

Do not report that the app has no bugs solely because automated tests pass. Clearly separate verified behavior from pending physical-device QA.

## 15. Mandatory acceptance checklist

Before presenting:

- Login works for Student and Teacher.
- Invalid credentials show an understandable error.
- Student Home shows the correct course/session state.
- Student cannot check in before the teacher opens the session.
- Teacher can create a session with picker-based date/time/radius values.
- Teacher can open and close a session only after confirmation.
- Student sees the teacher-opened state without duplicating courses.
- Student check-in uses current GPS data and backend validation.
- Outside-radius and low-accuracy states are clear.
- Duplicate check-in is rejected.
- Attendance appears in student history.
- Teacher dashboard reflects student attendance.
- Room Settings update linked courses, sessions, dashboard, analytics, and map data.
- Delete actions work and are protected by confirmation.
- Refresh buttons actually reload data.
- All screens have readable contrast and accessible touch targets.
- No user-facing `Demo` wording remains; use formal terms such as `Presentation access` or `Prepared attendance data`.
- App works through Expo Go on a physical iPhone using a LAN API URL.
- Real-device GPS, permission denial, Location Services disabled, Wi-Fi change, background/foreground, and session expiry are tested.

## 16. Known limitations and next development order

Current limitations:

1. Google Maps provider/API key is deferred.
2. Native map behavior has not been fully verified on physical iOS/Android devices.
3. Backend is local SQLite and is not deployed with HTTPS.
4. Coordinates require authoritative KMUTNB verification.
5. GPS spoofing detection is not implemented.
6. Production secrets, backups, monitoring, and rate limiting are pending.
7. Attendance correction, date filtering, and export are pending.
8. The legacy unassigned classroom needs cleanup.
9. Presentation credentials must not be used in production.

Recommended next order:

1. Complete Expo Go iPhone testing with the local LAN backend.
2. Fix any device-only GPS, permission, layout, or networking issues.
3. Verify Building 44 and Building 52 coordinates.
4. Clean or assign the legacy classroom record.
5. Add teacher attendance filters, correction, and export.
6. Deploy the backend with HTTPS, secrets, backups, and monitoring.
7. Configure EAS development/preview/production builds.
8. Revisit Google Maps only after billing and restricted API keys are available.
9. Replace presentation credentials with real account provisioning before production.

## 17. Working style for future development

- Inspect the repository before editing.
- Preserve unrelated user changes.
- Implement the smallest complete change that satisfies the request.
- Prefer shared components and theme tokens over duplicated styles.
- Keep all user-facing text in English.
- Explain technical results to the owner in Thai when appropriate.
- Do not claim a feature is real unless the data path, backend validation, and UI state are connected.
- Add or update tests for every business-rule change.
- Run the required checks before reporting completion.
- Report what was verified, what remains unverified, and any external setup the owner must perform.
