# Geo-Attendance User Manual

## Demo accounts

```text
Student: 65001 / 123456
Teacher: T001 / 123456
```

## Student flow

1. Open the application and select `Student` on the login screen.
2. Enter the Student ID and password, then select `Login`.
3. Review `Today's Attendance`, the course schedule, room, and building.
4. Select `Check in` while physically inside the selected classroom geofence.
5. Allow foreground location permission when prompted.
6. Keep Location Services enabled until the check-in completes.
7. Review the result. A successful check-in appears as `Checked in`.
8. Use `Attendance history` to review past records.
9. Use `Course details` to inspect classroom location and the last GPS reading.

## Teacher flow

1. Select `Teacher` on the login screen.
2. Enter the Teacher ID and password, then select `Login`.
3. Review the selected course, building, room, schedule, attendance rate, and student statuses.
4. Open `Sessions` and create a session with its date, class time, check-in window, classroom, and GPS radius.
5. Select `Open check-in` when students may check in.
6. Open `Students` to review the Present, Late, and Absent list.
7. Select `Close check-in` when attendance should stop. A closed session cannot accept new check-ins.
8. Open `Room settings` to review or update a classroom geofence.
9. Open `Analytics` to review attendance metrics and the status chart.
10. Select `Log out` when the session is complete.

## Troubleshooting

- If the API cannot be reached, confirm that the backend is running and that the mobile device uses the computer's LAN IP instead of `localhost`.
- If GPS accuracy is low, move to an open area and retry.
- If the student is outside the geofence, move closer to the designated classroom.
- If the app reports a duplicate check-in, review the existing record in `Attendance history`.
- If check-in is unavailable, ask the teacher to confirm that the correct session exists for today and is open.
