# Geo-Attendance Production Readiness Plan

## Scope

This document converts the production-readiness board into an implementation checklist for the Geo-Attendance system. The mobile UI remains English-only. The two production GPS reference points are:

| Building | Latitude | Longitude | Geofence radius | Example room |
|---|---:|---:|---:|---|
| 44 - Faculty of Science and Applied Technology | 13.8138 | 100.5334 | 50 m | Room 4401 |
| 52 - Faculty of Technical Education and Industrial Technology | 13.8147 | 100.5358 | 50 m | Room 5201 |

## Current implementation status

| Workstream | Status | Evidence |
|---|---|---|
| Two-building GPS dataset | Implemented | `buildings`, enriched room records, and course-to-room mapping are seeded in SQLite. |
| Authentication and authorization | Implemented for the current API | Password hashing, bearer access tokens, token expiry, logout, role checks, and ownership checks are implemented. |
| Real data model | Implemented for the current SQLite migration | Users, courses, buildings, rooms, class schedules, enrollments, attendance, and sessions are represented. |
| Today's Sessions and check-in windows | Implemented for the current MVP | The API calculates open, on-time, late, and close windows in `Asia/Bangkok`. |
| Backend deployment | Pending | Configure a hosted database/API, HTTPS, secrets, backups, and monitoring. |
| APK/mobile testing | Pending | Build an Android/iOS artifact and run the device test checklist. |
| GPS/geofencing test plan | Implemented as documentation and unit coverage | See `docs/Test-Cases.md`. |
| User manual and demo script | Implemented | See `docs/User-Manual.md` and `docs/Presentation-Demo-Script.md`. |

## API security rules

- Login returns a short-lived bearer access token.
- Passwords are stored as salted `scrypt` hashes for seeded and migrated users.
- Student endpoints accept only the authenticated student's own ID.
- Teacher endpoints accept only the authenticated teacher's own courses.
- Classroom management requires the teacher role.
- Dashboard access verifies teacher ownership of the selected course.
- The server recalculates geofence distance from the submitted GPS coordinates.
- Session dates use the `APP_TIMEZONE` environment variable and default to `Asia/Bangkok`.

## Remaining release work

1. Configure production environment variables and a hosted database.
2. Restrict CORS to the production application origins.
3. Add HTTPS, secret rotation, database backup, and error monitoring.
4. Build an Android APK and test on real devices near Buildings 44 and 52.
5. Add offline handling, retry policy, and a user-facing session-expired flow.
6. Add teacher course selection, attendance correction, date filters, and report export.
7. Perform user acceptance testing with real student and teacher accounts.
