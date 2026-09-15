const cors = require('cors');
const express = require('express');
const { database, checkDatabaseConnection } = require('./database/database');
const { calculateDistanceInMeters } = require('./utils/distance');
const { isWithinRadius } = require('./utils/geofence');
const { createAccessToken, hashAccessToken, verifyPassword } = require('./utils/auth');
const { getSessionDate } = require('./utils/date');
const { getSessionDetails } = require('./utils/session');
const {
  isValidLatitude,
  isValidLongitude,
  isValidRadius,
} = require('./utils/validation');

const app = express();

app.use(cors());
app.use(express.json());

function getUserByCode(userCode) {
  return database
    .prepare(
      `SELECT id, user_code AS userCode, name, email, role
       FROM users
       WHERE user_code = ?`,
    )
    .get(userCode);
}

function getBearerToken(request) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function requireAuth(request, response, next) {
  const token = getBearerToken(request);
  if (!token) return sendError(response, 401, 'AUTH_REQUIRED', 'A valid access token is required.');

  const session = database
    .prepare(`
      SELECT sessions.id AS sessionId, users.id, users.user_code AS userCode, users.name, users.email, users.role
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `)
    .get(hashAccessToken(token), new Date().toISOString());

  if (!session) return sendError(response, 401, 'AUTH_INVALID', 'The access token is invalid or expired.');

  request.auth = { ...session, token, sessionId: session.sessionId };
  return next();
}

function requireRole(role) {
  return (request, response, next) => {
    if (request.auth?.role !== role) {
      return sendError(response, 403, 'FORBIDDEN', `This action requires the ${role} role.`);
    }
    return next();
  };
}

function requireUserId(request, response, next) {
  const requestedId = Number(request.params.studentId ?? request.query.studentId ?? request.body?.studentId);
  if (!Number.isInteger(requestedId) || requestedId !== request.auth.id) {
    return sendError(response, 403, 'FORBIDDEN', 'You can only access your own student data.');
  }
  return next();
}

function getTeacherCourse(courseId, teacherId) {
  return database
    .prepare('SELECT id FROM courses WHERE id = ? AND teacher_id = ?')
    .get(courseId, teacherId);
}

function enrichCourse(course) {
  const session = getSessionDetails({
    dayOfWeek: course.dayOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
    openMinutesBefore: course.openMinutesBefore,
    lateAfterMinutes: course.lateAfterMinutes,
    closeMinutesAfter: course.closeMinutesAfter,
  });

  return { ...course, ...session };
}

function sortTodayCourses(courses) {
  return courses
    .map(enrichCourse)
    .sort((first, second) => Number(second.isToday) - Number(first.isToday) || first.courseCode.localeCompare(second.courseCode));
}

function sendError(response, status, code, message, details = {}) {
  return response.status(status).json({ code, message, ...details });
}

app.get('/api/health', (request, response) => {
  try {
    const databaseConnected = checkDatabaseConnection();

    response.json({
      status: 'ok',
      service: 'geo-attendance-api',
      database: databaseConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    response.status(503).json({
      status: 'error',
      service: 'geo-attendance-api',
      database: 'disconnected',
      message: 'The database is unavailable.',
    });
  }
});

app.post('/api/auth/login', (request, response) => {
  const { userCode, password } = request.body ?? {};

  if (!userCode || !password) {
    return sendError(response, 400, 'INVALID_LOGIN', 'User ID and password are required.');
  }

  const user = database
    .prepare(
      `SELECT id, user_code AS userCode, name, email, role
       FROM users
       WHERE user_code = ?`,
    )
    .get(String(userCode).trim());

  const passwordRecord = database
    .prepare('SELECT password_hash AS passwordHash FROM users WHERE user_code = ?')
    .get(String(userCode).trim());

  if (!user || !verifyPassword(password, passwordRecord?.passwordHash)) {
    return sendError(response, 401, 'INVALID_LOGIN', 'The user ID or password is incorrect.');
  }

  const token = createAccessToken();
  const expiresAt = new Date(Date.now() + (Number(process.env.SESSION_TTL_HOURS) || 8) * 60 * 60 * 1000).toISOString();
  database
    .prepare('INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(user.id, hashAccessToken(token), new Date().toISOString(), expiresAt);

  return response.json({ user, token, expiresAt });
});

app.post('/api/auth/logout', requireAuth, (request, response) => {
  database.prepare('DELETE FROM sessions WHERE id = ?').run(request.auth.sessionId);
  return response.json({ success: true });
});

app.get('/api/users/me', requireAuth, (request, response) => response.json({ user: {
  id: request.auth.id,
  userCode: request.auth.userCode,
  name: request.auth.name,
  email: request.auth.email,
  role: request.auth.role,
} }));

app.get('/api/teacher/courses', requireAuth, requireRole('teacher'), (request, response) => {
  const teacherId = Number(request.query.teacherId);
  if (teacherId !== request.auth.id) return sendError(response, 403, 'FORBIDDEN', 'You can only access your own courses.');

  const courses = database
    .prepare(
      `SELECT
         courses.id,
         courses.course_code AS courseCode,
         courses.course_name AS courseName,
         COALESCE(class_schedules.start_time || ' - ' || class_schedules.end_time, 'Schedule not set') AS schedule,
         class_schedules.day_of_week AS dayOfWeek,
         class_schedules.start_time AS startTime,
         class_schedules.end_time AS endTime,
         class_schedules.check_in_open_minutes_before AS openMinutesBefore,
         class_schedules.late_after_minutes AS lateAfterMinutes,
         class_schedules.check_in_close_minutes_after AS closeMinutesAfter,
         classrooms.id AS classroomId,
         classrooms.room_name AS roomName,
         buildings.building_code AS buildingCode,
         buildings.building_name AS buildingName,
         classrooms.room_number AS roomNumber,
         classrooms.latitude,
         classrooms.longitude,
         classrooms.radius,
         NULL AS checkInTime,
         NULL AS status
       FROM courses
       LEFT JOIN classrooms ON classrooms.id = courses.classroom_id
       LEFT JOIN buildings ON buildings.id = classrooms.building_id
       LEFT JOIN class_schedules ON class_schedules.course_id = courses.id
       WHERE courses.teacher_id = ?
       ORDER BY courses.course_code`,
    )
    .all(teacherId);

  return response.json({ courses: sortTodayCourses(courses) });
});

app.get('/api/courses', requireAuth, requireRole('student'), requireUserId, (request, response) => {
  const { studentId } = request.query;

  if (!studentId) {
    return sendError(response, 400, 'INVALID_REQUEST', 'Student ID is required.');
  }

  const courses = database
    .prepare(
      `SELECT
         courses.id,
         courses.course_code AS courseCode,
         courses.course_name AS courseName,
         COALESCE(class_schedules.start_time || ' - ' || class_schedules.end_time, 'Schedule not set') AS schedule,
         class_schedules.day_of_week AS dayOfWeek,
         class_schedules.start_time AS startTime,
         class_schedules.end_time AS endTime,
         class_schedules.check_in_open_minutes_before AS openMinutesBefore,
         class_schedules.late_after_minutes AS lateAfterMinutes,
         class_schedules.check_in_close_minutes_after AS closeMinutesAfter,
         classrooms.id AS classroomId,
         classrooms.room_name AS roomName,
         buildings.building_code AS buildingCode,
         buildings.building_name AS buildingName,
         classrooms.room_number AS roomNumber,
         classrooms.latitude,
         classrooms.longitude,
         classrooms.radius,
         attendance.check_in_time AS checkInTime,
         attendance.status
       FROM enrollments
       JOIN courses ON courses.id = enrollments.course_id
       LEFT JOIN classrooms ON classrooms.id = courses.classroom_id
       LEFT JOIN buildings ON buildings.id = classrooms.building_id
       LEFT JOIN class_schedules ON class_schedules.course_id = courses.id
       LEFT JOIN attendance
         ON attendance.course_id = courses.id
        AND attendance.student_id = enrollments.student_id
        AND attendance.session_date = ?
       WHERE enrollments.student_id = ?
       ORDER BY courses.course_code`,
    )
    .all(getSessionDate(), Number(studentId));

  return response.json({ courses: sortTodayCourses(courses) });
});

app.get('/api/attendance/student/:studentId', requireAuth, requireRole('student'), requireUserId, (request, response) => {
  const studentId = Number(request.params.studentId);

  const records = database
    .prepare(
      `SELECT
         attendance.id,
         courses.course_code AS courseCode,
         courses.course_name AS courseName,
         classrooms.room_name AS roomName,
         attendance.distance,
         attendance.accuracy,
         attendance.check_in_time AS checkInTime,
         attendance.session_date AS sessionDate,
         attendance.status
       FROM attendance
       JOIN courses ON courses.id = attendance.course_id
       JOIN classrooms ON classrooms.id = attendance.classroom_id
       WHERE attendance.student_id = ?
       ORDER BY attendance.check_in_time DESC`,
    )
    .all(studentId);

  return response.json({ records });
});

app.post('/api/attendance/check-in', requireAuth, requireRole('student'), requireUserId, (request, response) => {
  const {
    studentId,
    courseId,
    classroomId,
    latitude,
    longitude,
    accuracy,
  } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericAccuracy = accuracy == null ? null : Number(accuracy);

  if (!studentId || !courseId || !classroomId) {
    return sendError(response, 400, 'INVALID_REQUEST', 'Student, course, and classroom are required.');
  }

  if (!isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude)) {
    return sendError(response, 400, 'INVALID_COORDINATES', 'The GPS coordinates are invalid.');
  }

  const enrollment = database
    .prepare(
      `SELECT
         users.id AS studentId,
         courses.id AS courseId,
         classrooms.id AS classroomId,
         classrooms.latitude,
         classrooms.longitude,
         classrooms.radius,
         class_schedules.day_of_week AS dayOfWeek,
         class_schedules.start_time AS startTime,
         class_schedules.end_time AS endTime,
         class_schedules.check_in_open_minutes_before AS openMinutesBefore,
         class_schedules.late_after_minutes AS lateAfterMinutes,
         class_schedules.check_in_close_minutes_after AS closeMinutesAfter
       FROM enrollments
       JOIN users ON users.id = enrollments.student_id
       JOIN courses ON courses.id = enrollments.course_id
       JOIN classrooms ON classrooms.id = ?
       LEFT JOIN class_schedules ON class_schedules.course_id = courses.id
       WHERE enrollments.student_id = ? AND enrollments.course_id = ?
         AND courses.classroom_id = classrooms.id`,
    )
    .get(Number(classroomId), Number(studentId), Number(courseId));

  if (!enrollment) {
    return sendError(response, 404, 'ENROLLMENT_NOT_FOUND', 'The student is not enrolled in this course.');
  }

  const session = getSessionDetails(enrollment);
  if (session.sessionStatus === 'not_today') {
    return sendError(response, 409, 'SESSION_NOT_TODAY', 'This course does not have a session scheduled today.', {
      dayOfWeek: enrollment.dayOfWeek,
    });
  }
  if (session.sessionStatus === 'upcoming') {
    return sendError(response, 409, 'SESSION_NOT_OPEN', `Check-in opens at ${session.checkInOpenTime}.`, {
      checkInOpenTime: session.checkInOpenTime,
    });
  }
  if (session.sessionStatus === 'closed') {
    return sendError(response, 409, 'SESSION_CLOSED', 'Check-in for this session is closed.', {
      checkInCloseTime: session.checkInCloseTime,
    });
  }

  const existing = database
    .prepare(
      `SELECT id, check_in_time AS checkInTime
       FROM attendance
       WHERE student_id = ? AND course_id = ? AND session_date = ?`,
    )
    .get(Number(studentId), Number(courseId), getSessionDate());

  if (existing) {
    return sendError(response, 409, 'DUPLICATE_CHECK_IN', 'You have already checked in for this session.', {
      checkInTime: existing.checkInTime,
    });
  }

  if (numericAccuracy != null && (!Number.isFinite(numericAccuracy) || numericAccuracy > 100)) {
    return sendError(response, 400, 'LOW_ACCURACY', 'GPS accuracy is too low. Please move to an open area and try again.', {
      accuracy: numericAccuracy,
    });
  }

  const distance = calculateDistanceInMeters(
    numericLatitude,
    numericLongitude,
    enrollment.latitude,
    enrollment.longitude,
  );

  if (!isWithinRadius(distance, enrollment.radius)) {
    return sendError(response, 403, 'OUTSIDE_GEOFENCE', 'You are outside the classroom area.', {
      distance,
      radius: enrollment.radius,
    });
  }

  const checkInTime = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO attendance
       (student_id, course_id, classroom_id, latitude, longitude, accuracy, distance, session_date, check_in_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      Number(studentId),
      Number(courseId),
      Number(classroomId),
      numericLatitude,
      numericLongitude,
      numericAccuracy,
      distance,
      getSessionDate(),
      checkInTime,
      session.onTimeAllowed ? 'present' : 'late',
    );

  return response.status(201).json({
    attendance: {
      id: result.lastInsertRowid,
      distance,
      radius: enrollment.radius,
      checkInTime,
      status: session.onTimeAllowed ? 'present' : 'late',
    },
  });
});

app.get('/api/dashboard', requireAuth, requireRole('teacher'), (request, response) => {
  const courseId = Number(request.query.courseId);
  if (!getTeacherCourse(courseId, request.auth.id)) {
    return sendError(response, 403, 'FORBIDDEN', 'You can only view dashboards for your own courses.');
  }
  const sessionDate = getSessionDate();

  const summary = database
    .prepare(
      `SELECT
         COUNT(enrollments.student_id) AS totalStudents,
         SUM(CASE WHEN attendance.status = 'present' THEN 1 ELSE 0 END) AS presentCount,
         SUM(CASE WHEN attendance.status = 'late' THEN 1 ELSE 0 END) AS lateCount,
         SUM(CASE WHEN attendance.id IS NULL OR attendance.status = 'absent' THEN 1 ELSE 0 END) AS absentCount
       FROM enrollments
       LEFT JOIN attendance
         ON attendance.student_id = enrollments.student_id
        AND attendance.course_id = enrollments.course_id
        AND attendance.session_date = ?
       WHERE enrollments.course_id = ?`,
    )
    .get(sessionDate, courseId);

  const totalStudents = Number(summary.totalStudents ?? 0);
  const presentCount = Number(summary.presentCount ?? 0);
  const lateCount = Number(summary.lateCount ?? 0);
  const absentCount = Number(summary.absentCount ?? 0);
  const attendanceRate = totalStudents === 0 ? 0 : ((presentCount + lateCount) / totalStudents) * 100;

  const students = database
    .prepare(
      `SELECT
         users.user_code AS userCode,
         users.name,
         attendance.check_in_time AS checkInTime,
         attendance.distance,
         attendance.status
       FROM enrollments
       JOIN users ON users.id = enrollments.student_id
       LEFT JOIN attendance
         ON attendance.student_id = enrollments.student_id
        AND attendance.course_id = enrollments.course_id
        AND attendance.session_date = ?
       WHERE enrollments.course_id = ?
       ORDER BY users.user_code`,
    )
    .all(sessionDate, courseId);

  return response.json({
    summary: { totalStudents, presentCount, lateCount, absentCount, attendanceRate },
    students,
  });
});

app.get('/api/classrooms', requireAuth, requireRole('teacher'), (request, response) => {
  const classrooms = database
    .prepare(
      `SELECT classrooms.id, classrooms.room_name AS roomName, classrooms.latitude, classrooms.longitude, classrooms.radius,
              classrooms.room_number AS roomNumber, classrooms.capacity,
              buildings.building_code AS buildingCode, buildings.building_name AS buildingName
       FROM classrooms
       LEFT JOIN buildings ON buildings.id = classrooms.building_id
       ORDER BY room_name`,
    )
    .all();

  return response.json({ classrooms });
});

app.post('/api/classrooms', requireAuth, requireRole('teacher'), (request, response) => {
  const { roomName, latitude, longitude, radius } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericRadius = Number(radius);

  if (!roomName || !isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude) || !isValidRadius(numericRadius)) {
    return sendError(response, 400, 'INVALID_CLASSROOM', 'Room name, coordinates, and a positive radius are required.');
  }

  const result = database
    .prepare(
      `INSERT INTO classrooms (room_name, latitude, longitude, radius)
       VALUES (?, ?, ?, ?)`,
    )
    .run(String(roomName).trim(), numericLatitude, numericLongitude, numericRadius);

  return response.status(201).json({
    classroom: {
      id: result.lastInsertRowid,
      roomName: String(roomName).trim(),
      latitude: numericLatitude,
      longitude: numericLongitude,
      radius: numericRadius,
    },
  });
});

app.put('/api/classrooms/:id', requireAuth, requireRole('teacher'), (request, response) => {
  const { roomName, latitude, longitude, radius } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericRadius = Number(radius);

  if (!roomName || !isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude) || !isValidRadius(numericRadius)) {
    return sendError(response, 400, 'INVALID_CLASSROOM', 'Room name, coordinates, and a positive radius are required.');
  }

  const result = database
    .prepare(
      `UPDATE classrooms
       SET room_name = ?, latitude = ?, longitude = ?, radius = ?
       WHERE id = ?`,
    )
    .run(String(roomName).trim(), numericLatitude, numericLongitude, numericRadius, Number(request.params.id));

  if (result.changes === 0) {
    return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The classroom was not found.');
  }

  return response.json({
    classroom: {
      id: Number(request.params.id),
      roomName: String(roomName).trim(),
      latitude: numericLatitude,
      longitude: numericLongitude,
      radius: numericRadius,
    },
  });
});

module.exports = app;
