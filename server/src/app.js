require('dotenv').config({ quiet: true });

const cors = require('cors');
const express = require('express');
const { database, checkDatabaseConnection } = require('./database/database');
const { calculateDistanceInMeters } = require('./utils/distance');
const { isWithinRadius } = require('./utils/geofence');
const { createAccessToken, hashAccessToken, hashPassword, verifyPassword } = require('./utils/auth');
const { getSessionDate } = require('./utils/date');
const { getControlledSessionDetails, getSessionDetails } = require('./utils/session');
const {
  isValidLatitude,
  isValidLongitude,
  isValidRadius,
  isValidAccuracy,
  getGpsAccuracyLimit,
  isValidId,
} = require('./utils/validation');

const app = express();

const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors(
  configuredCorsOrigins.length > 0
    ? {
        origin(origin, callback) {
          if (!origin || configuredCorsOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error('Origin is not allowed by CORS.'));
        },
      }
    : undefined,
));
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
  if (course.sessionId) {
    const session = getControlledSessionDetails(course);
    return {
      ...course,
      dayOfWeek: course.dayOfWeek || 'Today',
      startTime: course.classStartTime,
      endTime: course.classEndTime,
      schedule: `${course.classStartTime} - ${course.classEndTime}`,
      ...session,
    };
  }

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

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeString(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseSessionInput(body = {}, defaults = {}) {
  const sessionDate = String(body.sessionDate ?? defaults.sessionDate ?? '').trim();
  const classStartTime = String(body.classStartTime ?? defaults.classStartTime ?? '').trim();
  const classEndTime = String(body.classEndTime ?? defaults.classEndTime ?? '').trim();
  const checkinOpenTime = String(body.checkinOpenTime ?? defaults.checkinOpenTime ?? '').trim();
  const checkinCloseTime = String(body.checkinCloseTime ?? defaults.checkinCloseTime ?? '').trim();
  const gpsRadius = Number(body.gpsRadius ?? defaults.gpsRadius);

  if (!isValidDateString(sessionDate) || !isValidTimeString(classStartTime) || !isValidTimeString(classEndTime) || !isValidTimeString(checkinOpenTime) || !isValidTimeString(checkinCloseTime) || classStartTime >= classEndTime || checkinOpenTime >= checkinCloseTime || !isValidRadius(gpsRadius)) {
    return null;
  }

  return { sessionDate, classStartTime, classEndTime, checkinOpenTime, checkinCloseTime, gpsRadius };
}

function getSessionRecord(sessionId) {
  return database.prepare(
    `SELECT class_sessions.id, class_sessions.course_id AS courseId, class_sessions.teacher_id AS teacherId,
            class_sessions.classroom_id AS classroomId, class_sessions.session_date AS sessionDate,
            class_sessions.class_start_time AS classStartTime, class_sessions.class_end_time AS classEndTime,
            class_sessions.checkin_open_time AS checkinOpenTime, class_sessions.checkin_close_time AS checkinCloseTime,
            class_sessions.gps_radius AS gpsRadius, class_sessions.status, class_sessions.opened_at AS openedAt,
            class_sessions.closed_at AS closedAt, class_sessions.created_at AS createdAt, class_sessions.updated_at AS updatedAt,
            courses.course_code AS courseCode, courses.course_name AS courseName,
            classrooms.room_name AS roomName, classrooms.latitude, classrooms.longitude,
            buildings.building_code AS buildingCode, buildings.building_name AS buildingName
     FROM class_sessions
     JOIN courses ON courses.id = class_sessions.course_id
     JOIN classrooms ON classrooms.id = class_sessions.classroom_id
     LEFT JOIN buildings ON buildings.id = classrooms.building_id
     WHERE class_sessions.id = ?`,
  ).get(Number(sessionId));
}

function serializeSession(session) {
  if (!session) return null;
  const graceMinutes = Math.max(0, Number(process.env.SESSION_EDIT_GRACE_MINUTES ?? 30));
  const closedAt = session.closedAt ? new Date(session.closedAt) : null;
  const editableUntil = closedAt && !Number.isNaN(closedAt.getTime())
    ? new Date(closedAt.getTime() + graceMinutes * 60 * 1000).toISOString()
    : null;
  const canEditClosedSession = ['CLOSED', 'CANCELLED'].includes(session.status)
    && editableUntil != null
    && Date.now() <= new Date(editableUntil).getTime();
  return { ...session, ...getControlledSessionDetails(session), editableUntil, canEdit: session.status === 'SCHEDULED' || canEditClosedSession };
}

function canEditSession(current) {
  if (current.status === 'SCHEDULED') return true;
  if (!['CLOSED', 'CANCELLED'].includes(current.status) || !current.closedAt) return false;
  const graceMinutes = Math.max(0, Number(process.env.SESSION_EDIT_GRACE_MINUTES ?? 30));
  const closedAt = new Date(current.closedAt).getTime();
  return Number.isFinite(closedAt) && Date.now() <= closedAt + graceMinutes * 60 * 1000;
}

function sortTodayCourses(courses) {
  const seenCourseIds = new Set();
  const sessionPriority = {
    open: 5,
    late: 4,
    scheduled: 3,
    upcoming: 2,
    closed_by_teacher: 1,
    closed: 0,
    cancelled: -1,
  };

  return courses
    .map(enrichCourse)
    .sort((first, second) => Number(second.isToday) - Number(first.isToday)
      || (sessionPriority[second.sessionStatus] ?? 0) - (sessionPriority[first.sessionStatus] ?? 0)
      || first.courseCode.localeCompare(second.courseCode))
    .filter((course) => {
      if (seenCourseIds.has(course.id)) return false;
      seenCourseIds.add(course.id);
      return true;
    });
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

app.post('/api/auth/register', (request, response) => {
  if (process.env.ALLOW_STUDENT_REGISTRATION === 'false') {
    return sendError(response, 403, 'REGISTRATION_DISABLED', 'New account registration is currently disabled.');
  }

  const userCode = String(request.body?.userCode ?? '').trim();
  const name = String(request.body?.name ?? '').trim();
  const email = String(request.body?.email ?? '').trim().toLowerCase();
  const password = String(request.body?.password ?? '');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(userCode) || name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return sendError(response, 400, 'INVALID_REGISTRATION', 'Enter a valid ID, name, email, and a password with at least 8 characters.');
  }

  try {
    const result = database.prepare(
      `INSERT INTO users (user_code, name, email, password, password_hash, role)
       VALUES (?, ?, ?, '', ?, 'student')`,
    ).run(userCode, name, email, hashPassword(password));
    const user = getUserByCode(userCode);
    const token = createAccessToken();
    const expiresAt = new Date(Date.now() + (Number(process.env.SESSION_TTL_HOURS) || 8) * 60 * 60 * 1000).toISOString();
    database.prepare('INSERT INTO sessions (user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)').run(result.lastInsertRowid, hashAccessToken(token), new Date().toISOString(), expiresAt);
    return response.status(201).json({ user, token, expiresAt });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return sendError(response, 409, 'ACCOUNT_EXISTS', 'This ID or email is already registered.');
    }
    throw error;
  }
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
          COALESCE(class_sessions.class_start_time || ' - ' || class_sessions.class_end_time, class_schedules.start_time || ' - ' || class_schedules.end_time, 'Schedule not set') AS schedule,
          class_schedules.day_of_week AS dayOfWeek,
          class_schedules.start_time AS startTime,
          class_schedules.end_time AS endTime,
         class_schedules.check_in_open_minutes_before AS openMinutesBefore,
         class_schedules.late_after_minutes AS lateAfterMinutes,
          class_schedules.check_in_close_minutes_after AS closeMinutesAfter,
          class_sessions.id AS sessionId,
          class_sessions.session_date AS sessionDate,
          class_sessions.class_start_time AS classStartTime,
          class_sessions.class_end_time AS classEndTime,
          class_sessions.checkin_open_time AS checkinOpenTime,
          class_sessions.checkin_close_time AS checkinCloseTime,
          class_sessions.gps_radius AS sessionRadius,
          class_sessions.status AS sessionControlStatus,
         COALESCE(session_classrooms.id, course_classrooms.id) AS classroomId,
         COALESCE(session_classrooms.room_name, course_classrooms.room_name) AS roomName,
         COALESCE(session_buildings.building_code, course_buildings.building_code) AS buildingCode,
         COALESCE(session_buildings.building_name, course_buildings.building_name) AS buildingName,
         COALESCE(session_classrooms.room_number, course_classrooms.room_number) AS roomNumber,
         COALESCE(session_classrooms.latitude, course_classrooms.latitude) AS latitude,
         COALESCE(session_classrooms.longitude, course_classrooms.longitude) AS longitude,
          COALESCE(class_sessions.gps_radius, session_classrooms.radius, course_classrooms.radius) AS radius,
         NULL AS checkInTime,
         NULL AS status
       FROM courses
       LEFT JOIN classrooms AS course_classrooms ON course_classrooms.id = courses.classroom_id
        LEFT JOIN buildings AS course_buildings ON course_buildings.id = course_classrooms.building_id
        LEFT JOIN class_schedules ON class_schedules.course_id = courses.id
        LEFT JOIN class_sessions ON class_sessions.course_id = courses.id AND class_sessions.session_date = ?
        LEFT JOIN classrooms AS session_classrooms ON session_classrooms.id = class_sessions.classroom_id
        LEFT JOIN buildings AS session_buildings ON session_buildings.id = session_classrooms.building_id
        WHERE courses.teacher_id = ?
       ORDER BY courses.course_code`,
    )
     .all(getSessionDate(), teacherId);

  return response.json({ courses: sortTodayCourses(courses) });
});

app.post('/api/teacher/courses', requireAuth, requireRole('teacher'), (request, response) => {
  const courseCode = String(request.body?.courseCode ?? '').trim();
  const courseName = String(request.body?.courseName ?? '').trim();
  const classroomId = Number(request.body?.classroomId);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(courseCode) || courseName.length < 2 || courseName.length > 120 || !isValidId(classroomId)) {
    return sendError(response, 400, 'INVALID_COURSE', 'Enter a valid course code, course name, and classroom.');
  }
  if (!database.prepare('SELECT id FROM classrooms WHERE id = ?').get(classroomId)) {
    return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The selected classroom was not found.');
  }
  try {
    const result = database.prepare(
      'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
    ).run(courseCode, courseName, request.auth.id, classroomId);
    return response.status(201).json({ courseId: result.lastInsertRowid });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') return sendError(response, 409, 'COURSE_EXISTS', 'This course code or course name already exists.');
    throw error;
  }
});

app.get('/api/teacher/sessions', requireAuth, requireRole('teacher'), (request, response) => {
  const teacherId = Number(request.query.teacherId);
  if (!isValidId(teacherId) || teacherId !== request.auth.id) {
    return sendError(response, 403, 'FORBIDDEN', 'You can only access your own sessions.');
  }

  const sessions = database.prepare(
    `SELECT class_sessions.id
     FROM class_sessions
     WHERE class_sessions.teacher_id = ?
     ORDER BY class_sessions.session_date DESC, class_sessions.class_start_time DESC, class_sessions.id DESC`,
  ).all(teacherId).map((row) => serializeSession(getSessionRecord(row.id)));

  return response.json({ sessions });
});

app.get('/api/teacher/sessions/:id/attendance', requireAuth, requireRole('teacher'), (request, response) => {
  const sessionId = Number(request.params.id);
  const session = getSessionRecord(sessionId);
  if (!isValidId(sessionId) || !session || session.teacherId !== request.auth.id) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  }

  const students = database.prepare(
    `SELECT users.id AS studentId, users.user_code AS userCode, users.name,
            attendance.check_in_time AS checkInTime,
            attendance.distance, attendance.accuracy, attendance.status,
            attendance.attendance_source AS attendanceSource,
            attendance.notes
     FROM enrollments
     JOIN users ON users.id = enrollments.student_id
     LEFT JOIN attendance
       ON attendance.student_id = enrollments.student_id
      AND attendance.course_id = enrollments.course_id
      AND (attendance.session_id = ?
        OR (attendance.session_id IS NULL AND attendance.session_date = ?))
     WHERE enrollments.course_id = ?
     ORDER BY users.user_code`,
  ).all(sessionId, session.sessionDate, session.courseId);

  const totalStudents = students.length;
  const presentCount = students.filter((student) => student.status === 'present').length;
  const lateCount = students.filter((student) => student.status === 'late').length;
  const absentCount = totalStudents - presentCount - lateCount;

  return response.json({
    session: serializeSession(session),
    summary: {
      totalStudents,
      presentCount,
      lateCount,
      absentCount,
      attendanceRate: totalStudents === 0 ? 0 : ((presentCount + lateCount) / totalStudents) * 100,
    },
    students,
  });
});

app.patch('/api/teacher/sessions/:id/attendance/:studentId', requireAuth, requireRole('teacher'), (request, response) => {
  const sessionId = Number(request.params.id);
  const studentId = Number(request.params.studentId);
  const status = String(request.body?.status || '').toLowerCase();
  const notes = typeof request.body?.notes === 'string' ? request.body.notes.trim().slice(0, 500) : '';
  const session = getSessionRecord(sessionId);

  if (!isValidId(sessionId) || !session || session.teacherId !== request.auth.id) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  }
  if (!isValidId(studentId) || !['present', 'late'].includes(status)) {
    return sendError(response, 400, 'INVALID_REQUEST', 'Choose Present or Late and provide a valid student.');
  }
  const enrollment = database.prepare(
    `SELECT users.id, users.user_code AS userCode, users.name
     FROM enrollments JOIN users ON users.id = enrollments.student_id
     WHERE enrollments.student_id = ? AND enrollments.course_id = ?`,
  ).get(studentId, session.courseId);
  if (!enrollment) return sendError(response, 404, 'STUDENT_NOT_ENROLLED', 'The student is not enrolled in this course.');

  const now = new Date().toISOString();
  const existing = database.prepare(
    'SELECT id FROM attendance WHERE student_id = ? AND course_id = ? AND session_date = ?',
  ).get(studentId, session.courseId, session.sessionDate);

  if (existing) {
    database.prepare(
      `UPDATE attendance
       SET session_id = ?, classroom_id = ?, status = ?, check_in_time = ?,
           latitude = 0, longitude = 0, accuracy = NULL, distance = 0,
           notes = ?, attendance_source = 'manual', corrected_by = ?, corrected_at = ?
       WHERE id = ?`,
    ).run(sessionId, session.classroomId, status, now, notes || 'Manual attendance correction', request.auth.id, now, existing.id);
  } else {
    database.prepare(
      `INSERT INTO attendance
       (student_id, course_id, session_id, classroom_id, latitude, longitude, accuracy, distance,
        session_date, check_in_time, status, notes, attendance_source, corrected_by, corrected_at)
       VALUES (?, ?, ?, ?, 0, 0, NULL, 0, ?, ?, ?, ?, 'manual', ?, ?)`,
    ).run(studentId, session.courseId, sessionId, session.classroomId, session.sessionDate, now, status, notes || 'Manual attendance correction', request.auth.id, now);
  }

  const attendance = database.prepare(
    `SELECT id, status, check_in_time AS checkInTime, attendance_source AS attendanceSource, notes
     FROM attendance WHERE student_id = ? AND course_id = ? AND session_date = ?`,
  ).get(studentId, session.courseId, session.sessionDate);
  return response.json({ attendance, student: enrollment });
});

app.post('/api/teacher/sessions', requireAuth, requireRole('teacher'), (request, response) => {
  const { courseId, classroomId } = request.body ?? {};
  const numericCourseId = Number(courseId);
  const numericClassroomId = Number(classroomId);
  const course = database.prepare('SELECT id FROM courses WHERE id = ? AND teacher_id = ?').get(numericCourseId, request.auth.id);
  const classroom = database.prepare('SELECT id FROM classrooms WHERE id = ?').get(numericClassroomId);
  const input = parseSessionInput(request.body, { gpsRadius: classroom?.radius });

  if (!isValidId(numericCourseId) || !isValidId(numericClassroomId) || !course || !classroom) {
    return sendError(response, 400, 'INVALID_SESSION', 'A valid course and classroom are required.');
  }
  if (!input) {
    return sendError(response, 400, 'INVALID_SESSION', 'Enter a valid date, time range, check-in window, and GPS radius.');
  }

  const duplicate = database.prepare(
    `SELECT id FROM class_sessions
     WHERE course_id = ? AND session_date = ? AND class_start_time = ?`,
  ).get(numericCourseId, input.sessionDate, input.classStartTime);
  if (duplicate) {
    return sendError(response, 409, 'DUPLICATE_SESSION', 'A session for this course, date, and start time already exists. Edit the existing session or choose a different time.');
  }

  const now = new Date().toISOString();
  const result = database.prepare(
    `INSERT INTO class_sessions
      (course_id, teacher_id, classroom_id, session_date, class_start_time, class_end_time, checkin_open_time, checkin_close_time, gps_radius, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)`,
  ).run(numericCourseId, request.auth.id, numericClassroomId, input.sessionDate, input.classStartTime, input.classEndTime, input.checkinOpenTime, input.checkinCloseTime, input.gpsRadius, now, now);

  return response.status(201).json({ session: serializeSession(getSessionRecord(result.lastInsertRowid)) });
});

app.put('/api/teacher/sessions/:id', requireAuth, requireRole('teacher'), (request, response) => {
  const sessionId = Number(request.params.id);
  const current = getSessionRecord(sessionId);
  if (!isValidId(sessionId) || !current || current.teacherId !== request.auth.id) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  }
  if (!canEditSession(current)) {
    return sendError(response, 409, 'SESSION_LOCKED', 'This session is outside the allowed correction window.', {
      editableUntil: serializeSession(current)?.editableUntil ?? null,
    });
  }

  const courseId = Number(request.body?.courseId ?? current.courseId);
  const classroomId = Number(request.body?.classroomId ?? current.classroomId);
  const course = database.prepare('SELECT id FROM courses WHERE id = ? AND teacher_id = ?').get(courseId, request.auth.id);
  const classroom = database.prepare('SELECT id FROM classrooms WHERE id = ?').get(classroomId);
  const input = parseSessionInput(request.body, { ...current, gpsRadius: current.gpsRadius });
  if (!isValidId(courseId) || !isValidId(classroomId) || !course || !classroom || !input) {
    return sendError(response, 400, 'INVALID_SESSION', 'Enter valid session details.');
  }

  const duplicate = database.prepare(
    `SELECT id FROM class_sessions
     WHERE course_id = ? AND session_date = ? AND class_start_time = ? AND id <> ?`,
  ).get(courseId, input.sessionDate, input.classStartTime, sessionId);
  if (duplicate) {
    return sendError(response, 409, 'DUPLICATE_SESSION', 'Another session for this course, date, and start time already exists.');
  }

  database.prepare(
    `UPDATE class_sessions
     SET course_id = ?, classroom_id = ?, session_date = ?, class_start_time = ?, class_end_time = ?,
         checkin_open_time = ?, checkin_close_time = ?, gps_radius = ?, updated_at = ?
     WHERE id = ? AND teacher_id = ?`,
  ).run(courseId, classroomId, input.sessionDate, input.classStartTime, input.classEndTime, input.checkinOpenTime, input.checkinCloseTime, input.gpsRadius, new Date().toISOString(), sessionId, request.auth.id);

  return response.json({ session: serializeSession(getSessionRecord(sessionId)) });
});

function controlSession(request, response, nextStatus) {
  const sessionId = Number(request.params.id);
  const current = getSessionRecord(sessionId);
  if (!isValidId(sessionId) || !current || current.teacherId !== request.auth.id) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  }
  if (nextStatus === 'OPEN' && ['CLOSED', 'CANCELLED'].includes(current.status)) {
    return sendError(response, 409, 'SESSION_LOCKED', 'This session cannot be opened again.');
  }
  if (nextStatus === 'CLOSED' && current.status === 'CANCELLED') {
    return sendError(response, 409, 'SESSION_LOCKED', 'A cancelled session cannot be closed.');
  }
  if (nextStatus === 'CANCELLED' && current.status === 'CLOSED') {
    return sendError(response, 409, 'SESSION_LOCKED', 'A closed session cannot be cancelled.');
  }

  const now = new Date().toISOString();
  database.prepare(
    `UPDATE class_sessions
     SET status = ?, opened_at = CASE WHEN ? = 'OPEN' THEN COALESCE(opened_at, ?) ELSE opened_at END,
         closed_at = CASE WHEN ? IN ('CLOSED', 'CANCELLED') THEN ? ELSE closed_at END,
         updated_at = ?
     WHERE id = ? AND teacher_id = ?`,
  ).run(nextStatus, nextStatus, now, nextStatus, now, now, sessionId, request.auth.id);

  return response.json({ session: serializeSession(getSessionRecord(sessionId)) });
}

app.post('/api/teacher/sessions/:id/open', requireAuth, requireRole('teacher'), (request, response) => controlSession(request, response, 'OPEN'));
app.post('/api/teacher/sessions/:id/close', requireAuth, requireRole('teacher'), (request, response) => controlSession(request, response, 'CLOSED'));
app.post('/api/teacher/sessions/:id/cancel', requireAuth, requireRole('teacher'), (request, response) => controlSession(request, response, 'CANCELLED'));

app.delete('/api/teacher/sessions/:id', requireAuth, requireRole('teacher'), (request, response) => {
  const sessionId = Number(request.params.id);
  const current = getSessionRecord(sessionId);
  if (!isValidId(sessionId) || !current || current.teacherId !== request.auth.id) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  }
  if (!['CLOSED', 'CANCELLED'].includes(current.status)) {
    return sendError(response, 409, 'SESSION_LOCKED', 'Only closed or cancelled sessions can be deleted.');
  }

  const attendanceCount = database.prepare(
    `SELECT COUNT(*) AS count FROM attendance
     WHERE session_id = ? OR (session_id IS NULL AND course_id = ? AND session_date = ?)`,
  ).get(sessionId, current.courseId, current.sessionDate).count;
  if (Number(attendanceCount) > 0) {
    return sendError(response, 409, 'SESSION_HAS_ATTENDANCE', 'This session has attendance records and cannot be deleted. Keep it as an audit record.');
  }

  const result = database.prepare('DELETE FROM class_sessions WHERE id = ? AND teacher_id = ?').run(sessionId, request.auth.id);
  if (result.changes === 0) return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session was not found.');
  return response.json({ deletedSessionId: sessionId });
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
          COALESCE(class_sessions.class_start_time || ' - ' || class_sessions.class_end_time, class_schedules.start_time || ' - ' || class_schedules.end_time, 'Schedule not set') AS schedule,
         class_schedules.day_of_week AS dayOfWeek,
         class_schedules.start_time AS startTime,
         class_schedules.end_time AS endTime,
         class_schedules.check_in_open_minutes_before AS openMinutesBefore,
         class_schedules.late_after_minutes AS lateAfterMinutes,
          class_schedules.check_in_close_minutes_after AS closeMinutesAfter,
          class_sessions.id AS sessionId,
          class_sessions.session_date AS sessionDate,
          class_sessions.class_start_time AS classStartTime,
          class_sessions.class_end_time AS classEndTime,
          class_sessions.checkin_open_time AS checkinOpenTime,
          class_sessions.checkin_close_time AS checkinCloseTime,
          class_sessions.gps_radius AS sessionRadius,
          class_sessions.status AS sessionControlStatus,
         COALESCE(session_classrooms.id, course_classrooms.id) AS classroomId,
         COALESCE(session_classrooms.room_name, course_classrooms.room_name) AS roomName,
         COALESCE(session_buildings.building_code, course_buildings.building_code) AS buildingCode,
         COALESCE(session_buildings.building_name, course_buildings.building_name) AS buildingName,
         COALESCE(session_classrooms.room_number, course_classrooms.room_number) AS roomNumber,
         COALESCE(session_classrooms.latitude, course_classrooms.latitude) AS latitude,
         COALESCE(session_classrooms.longitude, course_classrooms.longitude) AS longitude,
          COALESCE(class_sessions.gps_radius, session_classrooms.radius, course_classrooms.radius) AS radius,
         attendance.check_in_time AS checkInTime,
         attendance.status
       FROM enrollments
       JOIN courses ON courses.id = enrollments.course_id
       LEFT JOIN classrooms AS course_classrooms ON course_classrooms.id = courses.classroom_id
        LEFT JOIN buildings AS course_buildings ON course_buildings.id = course_classrooms.building_id
        LEFT JOIN class_schedules ON class_schedules.course_id = courses.id
        LEFT JOIN class_sessions ON class_sessions.course_id = courses.id AND class_sessions.session_date = ?
        LEFT JOIN classrooms AS session_classrooms ON session_classrooms.id = class_sessions.classroom_id
        LEFT JOIN buildings AS session_buildings ON session_buildings.id = session_classrooms.building_id
        LEFT JOIN attendance
          ON attendance.course_id = courses.id
         AND attendance.student_id = enrollments.student_id
         AND attendance.session_date = ?
       WHERE enrollments.student_id = ?
       ORDER BY courses.course_code`,
    )
     .all(getSessionDate(), getSessionDate(), Number(studentId));

  return response.json({ courses: sortTodayCourses(courses) });
});

app.get('/api/attendance/student/:studentId', requireAuth, requireRole('student'), requireUserId, (request, response) => {
  const studentId = Number(request.params.studentId);
  const requestedDate = request.query.date ? String(request.query.date) : null;
  if (requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return sendError(response, 400, 'INVALID_DATE', 'Date must use YYYY-MM-DD format.');
  }

  const records = database
    .prepare(
      `SELECT
         COALESCE(attendance.id, -class_sessions.id) AS id,
         courses.course_code AS courseCode,
         courses.course_name AS courseName,
         COALESCE(session_classrooms.room_name, course_classrooms.room_name) AS roomName,
         attendance.distance,
         attendance.accuracy,
         attendance.check_in_time AS checkInTime,
         COALESCE(class_sessions.session_date, attendance.session_date) AS sessionDate,
         CASE
           WHEN class_sessions.status = 'CANCELLED' THEN 'cancelled'
           WHEN attendance.status IS NULL THEN 'absent'
           ELSE attendance.status
         END AS status
       FROM enrollments
       JOIN courses ON courses.id = enrollments.course_id
       JOIN class_sessions ON class_sessions.course_id = courses.id
       LEFT JOIN classrooms AS session_classrooms ON session_classrooms.id = class_sessions.classroom_id
       LEFT JOIN classrooms AS course_classrooms ON course_classrooms.id = courses.classroom_id
       LEFT JOIN attendance
         ON attendance.student_id = enrollments.student_id
        AND attendance.course_id = enrollments.course_id
        AND (attendance.session_id = class_sessions.id
          OR (attendance.session_id IS NULL AND attendance.session_date = class_sessions.session_date))
       WHERE enrollments.student_id = ?
         AND (? IS NULL OR class_sessions.session_date = ?)
         AND (attendance.id IS NOT NULL OR class_sessions.status IN ('CLOSED', 'CANCELLED'))
       UNION ALL
       SELECT
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
       JOIN enrollments ON enrollments.course_id = attendance.course_id AND enrollments.student_id = attendance.student_id
       JOIN classrooms ON classrooms.id = attendance.classroom_id
       WHERE attendance.student_id = ?
         AND attendance.session_id IS NULL
         AND (? IS NULL OR attendance.session_date = ?)
         AND NOT EXISTS (
           SELECT 1 FROM class_sessions
           WHERE class_sessions.course_id = attendance.course_id
             AND class_sessions.session_date = attendance.session_date
         )
       ORDER BY sessionDate DESC, checkInTime DESC`,
    )
    .all(studentId, requestedDate, requestedDate, studentId, requestedDate, requestedDate);

  return response.json({ records });
});

app.post('/api/attendance/check-in', requireAuth, requireRole('student'), requireUserId, (request, response) => {
  const {
    studentId,
    courseId,
    classroomId,
    sessionId,
    latitude,
    longitude,
    accuracy,
  } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericAccuracy = accuracy == null ? null : Number(accuracy);
  const numericSessionId = sessionId == null || sessionId === '' ? null : Number(sessionId);

  if (!isValidId(Number(studentId)) || !isValidId(Number(courseId)) || !isValidId(Number(classroomId))) {
    return sendError(response, 400, 'INVALID_REQUEST', 'Student, course, and classroom are required.');
  }

  if (!isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude)) {
    return sendError(response, 400, 'INVALID_COORDINATES', 'The GPS coordinates are invalid.');
  }

  if (numericSessionId != null && !isValidId(numericSessionId)) {
    return sendError(response, 400, 'INVALID_SESSION', 'A valid session ID is required.');
  }

  const gpsAccuracyLimit = getGpsAccuracyLimit();
  if (numericAccuracy != null && !isValidAccuracy(numericAccuracy, gpsAccuracyLimit)) {
    return sendError(response, 400, 'LOW_ACCURACY', 'GPS accuracy is too low. Please move to an open area and try again.', {
      accuracy: numericAccuracy,
      limit: gpsAccuracyLimit,
    });
  }

  const authenticatedStudentId = request.auth.id;

  const enrollment = database
    .prepare(
      `SELECT
         users.id AS studentId,
         courses.id AS courseId,
         courses.classroom_id AS courseClassroomId,
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
         `,
    )
    .get(Number(classroomId), authenticatedStudentId, Number(courseId));

  if (!enrollment) {
    return sendError(response, 404, 'ENROLLMENT_NOT_FOUND', 'The student is not enrolled in this course.');
  }

  const controlledSession = database.prepare(
    `SELECT id, course_id AS courseId, classroom_id AS classroomId, session_date AS sessionDate,
            class_start_time AS classStartTime, class_end_time AS classEndTime,
            checkin_open_time AS checkinOpenTime, checkin_close_time AS checkinCloseTime,
            gps_radius AS gpsRadius, status, opened_at AS openedAt, closed_at AS closedAt
     FROM class_sessions
     WHERE course_id = ? AND session_date = ? ${numericSessionId == null ? '' : 'AND id = ?'}
     ORDER BY id DESC LIMIT 1`,
  ).get(...(numericSessionId == null ? [Number(courseId), getSessionDate()] : [Number(courseId), getSessionDate(), numericSessionId]));

  if (numericSessionId != null && !controlledSession) {
    return sendError(response, 404, 'SESSION_NOT_FOUND', 'The session is not available for this course today.');
  }

  if (controlledSession && controlledSession.classroomId !== Number(classroomId)) {
    return sendError(response, 403, 'SESSION_CLASSROOM_MISMATCH', 'This session uses a different classroom.');
  }
  if (!controlledSession && enrollment.courseClassroomId !== Number(classroomId)) {
    return sendError(response, 404, 'ENROLLMENT_NOT_FOUND', 'The student is not enrolled in this classroom session.');
  }

  const session = controlledSession ? getControlledSessionDetails(controlledSession) : getSessionDetails(enrollment);
  const attendanceRadius = controlledSession?.gpsRadius ?? enrollment.radius;
  const attendanceSessionId = controlledSession?.id ?? null;
  if (controlledSession && session.sessionStatus === 'scheduled') {
    return sendError(response, 409, 'SESSION_NOT_OPEN', 'Check-in is not available until the teacher opens this session.', {
      checkInOpenTime: session.checkInOpenTime,
    });
  }
  if (controlledSession && session.sessionStatus === 'closed_by_teacher') {
    return sendError(response, 409, 'SESSION_CLOSED_BY_TEACHER', 'Check-in was closed by the teacher.', {
      checkInCloseTime: session.checkInCloseTime,
    });
  }
  if (controlledSession && session.sessionStatus === 'cancelled') {
    return sendError(response, 409, 'SESSION_CANCELLED', 'This session was cancelled by the teacher.');
  }
  if (controlledSession && session.sessionStatus === 'closed') {
    return sendError(response, 409, 'SESSION_CLOSED', 'Check-in for this session is closed.', {
      checkInCloseTime: session.checkInCloseTime,
    });
  }
  if (!controlledSession && session.sessionStatus === 'not_scheduled') {
    return sendError(response, 409, 'SESSION_NOT_SCHEDULED', 'This course does not have an active session schedule.');
  }
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
    .get(authenticatedStudentId, Number(courseId), getSessionDate());

  if (existing) {
    return sendError(response, 409, 'DUPLICATE_CHECK_IN', 'You have already checked in for this session.', {
      checkInTime: existing.checkInTime,
    });
  }

  const distance = calculateDistanceInMeters(
    numericLatitude,
    numericLongitude,
    enrollment.latitude,
    enrollment.longitude,
  );

  if (!isWithinRadius(distance, attendanceRadius)) {
    return sendError(response, 403, 'OUTSIDE_GEOFENCE', 'You are outside the classroom area.', {
      distance,
      radius: attendanceRadius,
    });
  }

  const checkInTime = new Date().toISOString();
  let result;
  try {
    result = database
      .prepare(
        `INSERT INTO attendance
         (student_id, course_id, session_id, classroom_id, latitude, longitude, accuracy, distance, session_date, check_in_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        authenticatedStudentId,
        Number(courseId),
        attendanceSessionId,
        Number(classroomId),
        numericLatitude,
        numericLongitude,
        numericAccuracy,
        distance,
        getSessionDate(),
        checkInTime,
        session.onTimeAllowed ? 'present' : 'late',
      );
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const conflictingAttendance = database
        .prepare(
          `SELECT check_in_time AS checkInTime
           FROM attendance
           WHERE student_id = ? AND course_id = ? AND session_date = ?`,
        )
        .get(authenticatedStudentId, Number(courseId), getSessionDate());

      return sendError(response, 409, 'DUPLICATE_CHECK_IN', 'You have already checked in for this session.', {
        checkInTime: conflictingAttendance?.checkInTime ?? null,
      });
    }
    throw error;
  }

  return response.status(201).json({
    attendance: {
      id: result.lastInsertRowid,
      distance,
      radius: attendanceRadius,
      checkInTime,
      status: session.onTimeAllowed ? 'present' : 'late',
    },
  });
});

app.get('/api/dashboard', requireAuth, requireRole('teacher'), (request, response) => {
  const courseId = Number(request.query.courseId);
  if (!isValidId(courseId)) {
    return sendError(response, 400, 'INVALID_REQUEST', 'A valid course ID is required.');
  }
  if (!getTeacherCourse(courseId, request.auth.id)) {
    return sendError(response, 403, 'FORBIDDEN', 'You can only view dashboards for your own courses.');
  }
  const sessionDate = request.query.date ? String(request.query.date) : getSessionDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return sendError(response, 400, 'INVALID_DATE', 'Date must use YYYY-MM-DD format.');
  }

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
         attendance.status,
         attendance.attendance_source AS attendanceSource
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
    date: sessionDate,
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
  const { roomName, latitude, longitude, radius, buildingId = null, roomNumber = null, capacity = 60 } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericRadius = Number(radius);
  const numericBuildingId = buildingId == null || buildingId === '' ? null : Number(buildingId);
  const numericCapacity = Number(capacity);

  if (!String(roomName ?? '').trim() || !isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude) || !isValidRadius(numericRadius) || (numericBuildingId != null && !isValidId(numericBuildingId)) || !Number.isInteger(numericCapacity) || numericCapacity <= 0) {
    return sendError(response, 400, 'INVALID_CLASSROOM', 'Room name, coordinates, and a positive radius are required.');
  }

  const result = database.prepare(
    `INSERT INTO classrooms (room_name, latitude, longitude, radius, building_id, room_number, capacity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(String(roomName).trim(), numericLatitude, numericLongitude, numericRadius, numericBuildingId, roomNumber ? String(roomNumber).trim() : null, numericCapacity);

  return response.status(201).json({ classroom: getClassroomById(result.lastInsertRowid) });
});

app.put('/api/classrooms/:id', requireAuth, requireRole('teacher'), (request, response) => {
  const classroomId = Number(request.params.id);
  if (!isValidId(classroomId)) return sendError(response, 400, 'INVALID_CLASSROOM', 'A valid classroom ID is required.');

  const current = getClassroomById(classroomId);
  if (!current) return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The classroom was not found.');

  const { roomName, latitude, longitude, radius } = request.body ?? {};
  const numericLatitude = Number(latitude);
  const numericLongitude = Number(longitude);
  const numericRadius = Number(radius);

  if (!String(roomName ?? '').trim() || !isValidLatitude(numericLatitude) || !isValidLongitude(numericLongitude) || !isValidRadius(numericRadius)) {
    return sendError(response, 400, 'INVALID_CLASSROOM', 'Room name, coordinates, and a positive radius are required.');
  }

  const result = database
    .prepare(
      `UPDATE classrooms
       SET room_name = ?, latitude = ?, longitude = ?, radius = ?
       WHERE id = ?`,
    )
    .run(String(roomName).trim(), numericLatitude, numericLongitude, numericRadius, classroomId);

  // Keep future teacher-controlled sessions aligned with the room settings.
  // Closed/open sessions retain their historical GPS radius for auditability.
  database.prepare(
    `UPDATE class_sessions
     SET gps_radius = ?, updated_at = ?
     WHERE classroom_id = ? AND status = 'SCHEDULED'`,
  ).run(numericRadius, new Date().toISOString(), classroomId);

  if (result.changes === 0) {
    return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The classroom was not found.');
  }

  return response.json({ classroom: getClassroomById(classroomId) });
});

app.delete('/api/classrooms/:id', requireAuth, requireRole('teacher'), (request, response) => {
  const classroomId = Number(request.params.id);
  if (!isValidId(classroomId)) return sendError(response, 400, 'INVALID_CLASSROOM', 'A valid classroom ID is required.');

  const current = getClassroomById(classroomId);
  if (!current) return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The classroom was not found.');

  const references = {
    courses: database.prepare('SELECT COUNT(*) AS count FROM courses WHERE classroom_id = ?').get(classroomId).count,
    schedules: database.prepare('SELECT COUNT(*) AS count FROM class_schedules WHERE classroom_id = ?').get(classroomId).count,
    sessions: database.prepare('SELECT COUNT(*) AS count FROM class_sessions WHERE classroom_id = ?').get(classroomId).count,
    attendance: database.prepare('SELECT COUNT(*) AS count FROM attendance WHERE classroom_id = ?').get(classroomId).count,
  };

  if (Object.values(references).some((count) => Number(count) > 0)) {
    return sendError(response, 409, 'CLASSROOM_IN_USE', 'This classroom is linked to existing courses, schedules, sessions, or attendance records and cannot be deleted.', { references });
  }

  const result = database.prepare('DELETE FROM classrooms WHERE id = ?').run(classroomId);
  if (result.changes === 0) return sendError(response, 404, 'CLASSROOM_NOT_FOUND', 'The classroom was not found.');

  return response.json({ deletedClassroomId: classroomId });
});

function getClassroomById(classroomId) {
  return database.prepare(
    `SELECT classrooms.id, classrooms.room_name AS roomName, classrooms.latitude, classrooms.longitude, classrooms.radius,
            classrooms.room_number AS roomNumber, classrooms.capacity,
            buildings.building_code AS buildingCode, buildings.building_name AS buildingName
     FROM classrooms
     LEFT JOIN buildings ON buildings.id = classrooms.building_id
     WHERE classrooms.id = ?`,
  ).get(Number(classroomId));
}

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return sendError(response, 400, 'INVALID_JSON', 'The request body must contain valid JSON.');
  }

  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return sendError(response, 409, 'DUPLICATE_RESOURCE', 'The requested record already exists.');
  }

  console.error(error);
  return sendError(response, 500, 'INTERNAL_ERROR', 'The server could not complete the request.');
});

module.exports = app;
