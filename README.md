# Geo-Attendance

Geo-Attendance is a mobile attendance demonstration that uses GPS and geofencing to help verify whether a student is near a classroom before checking in.

## Current status

The current demo includes:

- Expo SDK 57 mobile app created with TypeScript.
- Express backend created with a SQLite connection.
- Express backend with SQLite schema and seed data.
- Production-readiness seed data for Buildings 44 and 52 with explicit room and course mapping.
- `GET /api/health` verifies the API and database connection.
- Student login, course list, GPS permission, Haversine distance preview, check-in, duplicate protection, and attendance history are implemented.
- Student profile, location view, classroom radius preview, and English-only UI are implemented.
- Teacher dashboard statistics, attendance list, classroom management, and classroom map are implemented.
- Role-based navigation is implemented for Student (Home, History, Profile) and Teacher (Dashboard, Students, Classrooms, Statistics, Settings).
- Passwords are stored as salted `scrypt` hashes and protected API routes use expiring bearer access tokens.
- Student and teacher ownership checks are enforced at the API boundary.
- Session dates use `APP_TIMEZONE` and default to `Asia/Bangkok`.
- Today's Sessions shows the building, room, class time, check-in opening time, on-time deadline, close time, and live status.
- Check-in status is calculated by the backend as Open, Late, Closed, or Not Today.
- The student course action opens a dedicated Course Detail screen before check-in.
- Teacher Students and Statistics screens reuse the secured dashboard data returned by the backend.
- Presentation-ready demo data includes six enrolled students with Present, Late, and Absent states.
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

The API runs at `http://localhost:3000`.

Health check:

```text
GET http://localhost:3000/api/health
```

## Demo accounts

```text
Student ID: 65001
Password: 123456

Teacher ID: T001
Password: 123456
```

Additional seeded student accounts use IDs `65002` through `65006` with password `123456`. The teacher dashboard is seeded with a mixed attendance session so the summary cards and student list are populated during a presentation.

## Main API endpoints

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
GET  /api/courses?studentId=:studentId
GET  /api/teacher/courses?teacherId=:teacherId
GET  /api/attendance/student/:studentId
POST /api/attendance/check-in
GET  /api/dashboard?courseId=:courseId
GET  /api/classrooms
POST /api/classrooms
PUT  /api/classrooms/:id
```

Protected endpoints require:

```text
Authorization: Bearer <access-token>
```

Production GPS reference points:

```text
Building 44: 13.8138, 100.5334, radius 50 m, Room 4401
Building 52: 13.8147, 100.5358, radius 50 m, Room 5201
```

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

The native app uses `react-native-maps` for Android and iOS. The Windows web build uses a coordinate and radius fallback so the app remains usable without a map provider. Production store builds may require a provider API key and native rebuild.

## Development status

Completed foundation and product flow:

1. Project setup and API connection
2. GPS permission and current location
3. Geofencing and Haversine distance calculation
4. Student login, courses, course detail, check-in, and attendance history
5. Teacher dashboard, role-based navigation, statistics, student attendance, and classroom management
6. Testing, documentation, and web export verification

Suggested next work:

1. Add persistent authentication state and a session-expired flow in the mobile app.
2. Add course selection when a teacher owns more than one course.
3. Add date filters, attendance correction, and attendance export for teacher reports.
4. Add production secrets, deployment configuration, backups, and device QA.

See the complete production-readiness documents in `docs/`:

- `docs/Production-Readiness-Plan.md`
- `docs/Test-Cases.md`
- `docs/User-Manual.md`
- `docs/Presentation-Demo-Script.md`

## GPS limitation

GPS and geofencing can help reduce proxy attendance, but they cannot guarantee protection against GPS spoofing. The system does not claim to prevent cheating 100%.
