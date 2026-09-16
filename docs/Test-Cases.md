# Geo-Attendance Test Cases

## GPS and geofencing test matrix

The following cases are the minimum acceptance suite for Buildings 44 and 52. Replace the sample device coordinates with measured field coordinates during device QA.

| ID | Scenario | Expected result |
|---|---|---|
| GPS-01 | Submit a coordinate at the center of Building 44 | Check-in is accepted when the student is enrolled. |
| GPS-02 | Submit a coordinate at the center of Building 52 | Check-in is accepted when the student is enrolled. |
| GPS-03 | Submit a coordinate exactly 50 m from the selected building | Check-in is accepted because the boundary is inclusive. |
| GPS-04 | Submit a coordinate 51 m from the selected building | Check-in is rejected with `OUTSIDE_GEOFENCE`. |
| GPS-05 | Submit an invalid latitude or longitude | Request is rejected with `INVALID_COORDINATES`. |
| GPS-06 | Submit GPS accuracy greater than 100 m | Request is rejected with `LOW_ACCURACY`. |
| GPS-07 | Turn off device Location Services | The app explains that GPS must be enabled. |
| GPS-08 | Deny foreground location permission | The app explains that location permission is required. |
| GPS-09 | Submit a second check-in for the same student, course, and date | Request is rejected with `DUPLICATE_CHECK_IN`. |
| GPS-10 | Use a student who is not enrolled in the course | Request is rejected with `ENROLLMENT_NOT_FOUND`. |
| GPS-11 | Use a teacher token to access another teacher's dashboard | Request is rejected with `FORBIDDEN`. |
| GPS-12 | Use an expired or missing access token | Request is rejected with `AUTH_REQUIRED` or `AUTH_INVALID`. |
| SESSION-01 | Open a course during its configured check-in window | The API returns `checkInAllowed: true` and the button is enabled. |
| SESSION-02 | Open a course before the configured open time | The API returns `SESSION_NOT_OPEN` and shows the opening time. |
| SESSION-03 | Check in after the on-time threshold but before close | The attendance record is stored as `late`. |
| SESSION-04 | Check in after the close time | The API returns `SESSION_CLOSED`. |
| SESSION-05 | Check in for a course scheduled on another weekday | The API returns `SESSION_NOT_TODAY`. |
| SESSION-06 | Student checks in before a teacher-controlled session is opened | The API returns `SESSION_NOT_OPEN`. |
| SESSION-07 | Teacher opens a controlled session | The session changes to `OPEN` and an enrolled student may check in. |
| SESSION-08 | Teacher closes a controlled session | The session changes to `CLOSED` and new check-ins are rejected. |
| SESSION-09 | Teacher cancels a controlled session | The session changes to `CANCELLED` and new check-ins are rejected. |
| SESSION-10 | Another teacher modifies a session they do not own | The API returns `FORBIDDEN` or `SESSION_NOT_FOUND`. |

## Data and role test matrix

| ID | Scenario | Expected result |
|---|---|---|
| AUTH-01 | Login with a valid student account | A student token and student profile are returned. |
| AUTH-02 | Login with a valid teacher account | A teacher token and teacher profile are returned. |
| AUTH-03 | Login with an incorrect password | No token is returned. |
| DATA-01 | Load the student's courses | The response includes the correct building, room, and schedule. |
| DATA-02 | Load the teacher dashboard | Present, Late, Absent, and rate totals match the selected course. |
| DATA-03 | Save a classroom with an invalid radius | The API rejects the request. |
| DATA-04 | Use the logout endpoint | The session token can no longer access protected endpoints. |
| DATA-05 | Create a teacher-controlled session | The API stores the selected course, classroom, times, and GPS radius. |
| DATA-06 | Edit an unopened teacher-controlled session | The API updates the session and keeps it `SCHEDULED`. |

## Device QA checklist

- Android phone with precise location enabled.
- iOS phone with precise location enabled.
- Indoor test near the room entrance.
- Outdoor test at approximately 50 m and 51 m.
- Wi-Fi and mobile data test.
- Permission denied and permission restored.
- GPS disabled and GPS restored.
- App cold start after login.
- App resumed after backgrounding.
- Session-expired behavior.
