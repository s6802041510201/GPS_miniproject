# Teacher-Controlled Sessions

Teacher-controlled sessions replace hard-coded check-in windows with real session records created and controlled by the teacher.

## Session lifecycle

```text
SCHEDULED -> OPEN -> CLOSED
     \-> CANCELLED
```

- `SCHEDULED`: The session exists, but students cannot check in yet.
- `OPEN`: Students may check in when they are enrolled and inside the session classroom geofence.
- `CLOSED`: Check-in is no longer available. A teacher-closed session is shown as `Closed by teacher`.
- `CANCELLED`: The session is cancelled and cannot accept attendance.

## Teacher workflow

1. Sign in with the Teacher account.
2. Open `Sessions` from the teacher navigation bar.
3. Select a course and classroom.
4. Enter the session date, class start/end times, check-in open/close times, and GPS radius.
5. Select `Create session`.
6. Select `Open check-in` when students may check in.
7. Select `Close check-in` when attendance should stop.
8. Use `Cancel` for a session that will not take place.

Only the teacher who owns the course can create, edit, open, close, cancel, or delete its sessions. Scheduled sessions can be edited directly. Opened sessions must be confirmed before closing or cancelling. Closed and cancelled sessions are read-only; teachers can use `Edit as new` to create a corrected replacement without changing the audit record. A closed or cancelled session can be deleted only when it has no attendance records.

## Student validation

For a controlled session, the backend verifies:

- The session exists for the current date.
- The authenticated student is enrolled in the course.
- The selected classroom belongs to the session.
- The session is `OPEN`.
- The current time has not passed the check-in close time.
- GPS accuracy is acceptable.
- The server-calculated Haversine distance is inside the session GPS radius.
- The student has not already checked in for the course and date.

The mobile client cannot open a session or bypass the server decision.

## API endpoints

```text
GET  /api/teacher/sessions?teacherId=:teacherId
GET  /api/teacher/sessions/:id/attendance
POST /api/teacher/sessions
PUT  /api/teacher/sessions/:id
POST /api/teacher/sessions/:id/open
POST /api/teacher/sessions/:id/close
POST /api/teacher/sessions/:id/cancel
DELETE /api/teacher/sessions/:id
```

All session endpoints require a teacher bearer token. The `teacherId` query parameter is checked against the authenticated token; it is not trusted from the client.

## Database design

Authentication tokens remain in the existing `sessions` table. Teacher-controlled class meetings are stored separately in `class_sessions` so authentication and attendance scheduling do not share incompatible responsibilities.

`class_sessions` stores:

- Course, teacher, and classroom relationships.
- Session date.
- Class start and end times.
- Check-in opening and closing times.
- Session GPS radius.
- Lifecycle status.
- Actual `opened_at` and `closed_at` timestamps.

Attendance rows may reference `class_sessions.id`. The existing uniqueness rule still prevents duplicate attendance for the same student, course, and session date.

## Compatibility behavior

Existing weekly `class_schedules` remain available as a fallback for courses that do not yet have a teacher-controlled session. Once a `class_sessions` record exists for the current date, it takes precedence and students must use its lifecycle state.
