# Geo-Attendance

Geo-Attendance is a mobile attendance application that uses GPS and geofencing to verify whether a student is near a classroom before checking in.

## Current status

The current presentation build includes:

- Expo SDK 57 mobile app created with TypeScript.
- Express backend created with a SQLite connection.
- Express backend with SQLite schema and optional local seed data.
- Verified KMUTNB Bangkok reference data for Buildings 44 and 52 with explicit room mapping.
- `GET /api/health` verifies the API and database connection.
- Student login, course list, GPS permission, Haversine distance preview, check-in, duplicate protection, and attendance history are implemented.
- Student profile, location view, classroom radius preview, and English-only UI are implemented.
- Teacher dashboard statistics, attendance list, classroom management, and classroom map are implemented.
- Role-based navigation is implemented for Student (Home, History, Profile) and Teacher (Dashboard, Students, Classrooms, Statistics, Settings).
- Passwords are stored as salted `scrypt` hashes and protected API routes use expiring bearer access tokens.
- Native mobile sessions use `expo-secure-store` and restore the authenticated user through `GET /api/users/me`.
- Student and teacher ownership checks are enforced at the API boundary.
- Session dates use `APP_TIMEZONE` and default to `Asia/Bangkok`.
- Today's Sessions shows the building, room, class time, check-in opening time, on-time deadline, close time, and live status.
- Teacher-controlled Sessions lets teachers create, edit, open, close, and cancel course sessions without changing code or database rows manually.
- Closed and cancelled sessions can be corrected during the configured `SESSION_EDIT_GRACE_MINUTES` window (30 minutes by default); after that they become read-only.
- Student check-in uses the current teacher-controlled session when one exists for the date; scheduled sessions remain unavailable until the teacher opens them.
- Student Map Check-in includes a manual `Refresh location` action for GPS readings that are slow or stale.
- GPS accuracy is configurable with `GPS_ACCURACY_LIMIT_METERS` on the server and `EXPO_PUBLIC_GPS_ACCURACY_LIMIT_METERS` in the mobile app; the default is 150 meters for indoor/floor-level use while geofence distance validation remains active.
- Check-in status is calculated by the backend as Open, Late, Closed, or Not Today.
- The student course action opens a dedicated Course Detail screen before check-in.
- Teacher Students and Statistics screens reuse the secured dashboard data returned by the backend.
- Teachers can select the active course; Dashboard, Students, Analytics, and refresh operations use that selection.
- Presentation-ready attendance data includes six enrolled students with Present, Late, and Absent states.
- Modern blue visual system includes decorative graphics, responsive surfaces, clear button variants, and reduced-motion entrance effects.

## Project structure

```text
Geo-Attendance/
├── mobile/       # Expo React Native app
├── server/       # Express REST API and SQLite database
└── README.md
```

## Requirements

- Node.js 22.13 or newer
- npm
- Expo Go for device testing, or an Android emulator

## Run the backend

```bash
cd server
npm install
npm run dev
```

Before starting the backend, copy `server/.env.example` to `server/.env` and adjust the values for the local environment. The backend loads this file automatically.

The API runs at `http://localhost:3000`.

Health check:

```text
GET http://localhost:3000/api/health
```

## Account management

Production does not create hard-coded demo accounts. Students can create an account from the mobile sign-in screen through `POST /api/auth/register`.

Create the first teacher or an administrative student account from the server machine:

```bash
cd server
node scripts/create-user.js --role teacher --code T-001 --name "Teacher Name" --email teacher@university.ac.th --password "UseARealPassword"
```

Local presentation seed data is opt-in only. Set `SEED_DEMO_DATA=true` in `server/.env` when a disposable presentation database is required, and keep it `false` for production.

## Main API endpoints

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/users/me
GET  /api/courses?studentId=:studentId
GET  /api/teacher/courses?teacherId=:teacherId
GET  /api/teacher/sessions?teacherId=:teacherId
POST /api/teacher/sessions
PUT  /api/teacher/sessions/:id
POST /api/teacher/sessions/:id/open
POST /api/teacher/sessions/:id/close
POST /api/teacher/sessions/:id/cancel
GET  /api/attendance/student/:studentId
POST /api/attendance/check-in
GET  /api/dashboard?courseId=:courseId&date=YYYY-MM-DD
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/:id
```

Protected endpoints require:

```text
Authorization: Bearer <access-token>
```

GPS reference points for the KMUTNB Bangkok campus:

```text
Building 44: 13.81972, 100.51553, radius 50 m, Room 4401
Building 52: 13.82039, 100.51512, radius 50 m, Room 5201
```

These coordinates are building-level reference points and should be field-verified with a phone at the intended classroom entrance before production enforcement. Building identity is supported by the official KMUTNB campus information and Faculty of Technical Education facility information; Building 44's coordinate is cross-checked against OpenStreetMap data, while Building 52's coordinate is cross-checked against a location directory. See `docs/KMUTNB-Coordinate-Verification.md` for sources and the field-verification checklist.

The backend recalculates the distance from the submitted coordinates and the classroom coordinates. The client cannot declare itself present by sending a fabricated status or distance.

## Run the mobile app

In another terminal:

```bash
cd mobile
npm install
npx expo start
```

For Expo Go on a physical phone, set `EXPO_PUBLIC_API_URL` to the computer's LAN address before starting Expo, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

`localhost` works when the app runs on the same computer or an emulator configured to reach the host machine.

For a physical iPhone, use a reachable LAN or HTTPS API URL. Do not use `localhost` because it points to the phone itself.

The native app uses `react-native-maps` for Android and iOS. The Windows web build uses a coordinate and radius fallback so the app remains usable without a map provider. Production store builds may require a provider API key and native rebuild.

## Development status

Completed foundation and product flow:

1. Project setup and API connection
2. GPS permission and current location
3. Geofencing and Haversine distance calculation
4. Student login, courses, course detail, check-in, and attendance history
5. Teacher dashboard, role-based navigation, statistics, student attendance, and classroom management
6. Teacher-controlled session creation and lifecycle control
7. Testing, documentation, and web export verification

Suggested next work:

1. Add date filters, attendance correction, and attendance export for teacher reports.
2. Add production secrets, deployment configuration, backups, and device QA.
3. Verify real KMUTNB coordinates and test controlled sessions on physical devices.

See the complete production-readiness documents in `docs/`:

- `docs/Production-Readiness-Plan.md`
- `docs/Geo-Attendance-Debug-Report.md`
- `docs/Teacher-Controlled-Sessions.md`
- `docs/Test-Cases.md`
- `docs/User-Manual.md`
- `docs/Presentation-Script.md`

## GPS limitation

GPS and geofencing can help reduce proxy attendance, but they cannot guarantee protection against GPS spoofing. The system does not claim to prevent cheating 100%.
