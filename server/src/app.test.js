const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const app = require('./app');
const { database } = require('./database/database');
const { getSessionDate, getWeekdayName } = require('./utils/date');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) },
  });
  const body = await response.json();
  return { status: response.status, body };
}

async function login(userCode, password = '123456') {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userCode, password }),
  });
  assert.equal(result.status, 200);
  return result.body;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

test('protected API routes enforce authentication, role, and ownership', async () => {
  const student = await login('65001');
  const teacher = await login('T001');
  const otherStudent = database.prepare("SELECT id, user_code AS userCode FROM users WHERE role = 'student' AND user_code <> '65001' LIMIT 1").get();

  const teacherClassrooms = await request('/api/classrooms', {
    headers: authHeaders(teacher.token),
  });
  assert.equal(teacherClassrooms.status, 200);
  assert.ok(Array.isArray(teacherClassrooms.body.classrooms));

  const studentClassrooms = await request('/api/classrooms', {
    headers: authHeaders(student.token),
  });
  assert.equal(studentClassrooms.status, 403);

  const unauthenticated = await request('/api/users/me');
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticated.body.code, 'AUTH_REQUIRED');

  const wrongRole = await request(`/api/teacher/courses?teacherId=${teacher.user.id}`, {
    headers: authHeaders(student.token),
  });
  assert.equal(wrongRole.status, 403);

  const ownCourses = await request(`/api/courses?studentId=${student.user.id}`, {
    headers: authHeaders(student.token),
  });
  assert.equal(ownCourses.status, 200);
  assert.ok(Array.isArray(ownCourses.body.courses));
  const ownCourseIds = ownCourses.body.courses.map((course) => course.id);
  assert.equal(new Set(ownCourseIds).size, ownCourseIds.length);
  const controlledCourse = ownCourses.body.courses.find((course) => course.courseCode === '040613101');
  assert.ok(controlledCourse.sessionId);
  const persistedSession = database.prepare('SELECT status FROM class_sessions WHERE id = ?').get(controlledCourse.sessionId);
  assert.equal(controlledCourse.sessionControlStatus, persistedSession.status);

  const otherData = await request(`/api/courses?studentId=${otherStudent.id}`, {
    headers: authHeaders(student.token),
  });
  assert.equal(otherData.status, 403);

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(student.token),
  });
  assert.equal(logout.status, 200);

  const afterLogout = await request('/api/users/me', { headers: authHeaders(student.token) });
  assert.equal(afterLogout.status, 401);
  assert.equal(afterLogout.body.code, 'AUTH_INVALID');

  await request('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(teacher.token),
  });
});

test('check-in rejects malformed GPS accuracy and a classroom that is not mapped to the course', async () => {
  const student = await login('65001');
  const course = database.prepare('SELECT id, classroom_id AS classroomId FROM courses ORDER BY id LIMIT 1').get();
  const classroom = database.prepare('SELECT id, latitude, longitude FROM classrooms WHERE id <> ? ORDER BY id LIMIT 1').get(course.classroomId);

  const badAccuracy = await request('/api/attendance/check-in', {
    method: 'POST',
    headers: authHeaders(student.token),
    body: JSON.stringify({
      studentId: student.user.id,
      courseId: course.id,
      classroomId: course.classroomId,
      latitude: classroom.latitude,
      longitude: classroom.longitude,
      accuracy: -1,
    }),
  });
  assert.equal(badAccuracy.status, 400);
  assert.equal(badAccuracy.body.code, 'LOW_ACCURACY');

  const wrongClassroom = await request('/api/attendance/check-in', {
    method: 'POST',
    headers: authHeaders(student.token),
    body: JSON.stringify({
      studentId: student.user.id,
      courseId: course.id,
      classroomId: classroom.id,
      latitude: classroom.latitude,
      longitude: classroom.longitude,
      accuracy: 10,
    }),
  });
  assert.equal(wrongClassroom.status, 403);
  assert.equal(wrongClassroom.body.code, 'SESSION_CLASSROOM_MISMATCH');

  await request('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(student.token),
  });
});

test('check-in rejects courses without an active schedule', async () => {
  const student = await login('65001');
  const teacher = database.prepare("SELECT id FROM users WHERE user_code = 'T001'").get();
  const classroom = database.prepare('SELECT id, latitude, longitude FROM classrooms ORDER BY id LIMIT 1').get();
  const courseCode = `TEST-NO-SCHEDULE-${Date.now()}`;
  const course = database.prepare(
    'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
  ).run(courseCode, 'Temporary No Schedule Course', teacher.id, classroom.id);
  database.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(student.user.id, course.lastInsertRowid);

  try {
    const result = await request('/api/attendance/check-in', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify({
        studentId: student.user.id,
        courseId: course.lastInsertRowid,
        classroomId: classroom.id,
        latitude: classroom.latitude,
        longitude: classroom.longitude,
        accuracy: 10,
      }),
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'SESSION_NOT_SCHEDULED');
  } finally {
    database.prepare('DELETE FROM attendance WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM enrollments WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM class_schedules WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM courses WHERE id = ?').run(course.lastInsertRowid);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(student.token) });
  }
});

test('database uniqueness prevents duplicate check-ins even when requests are repeated', async () => {
  const student = await login('65001');
  const teacher = database.prepare("SELECT id FROM users WHERE user_code = 'T001'").get();
  const classroom = database.prepare('SELECT id, latitude, longitude FROM classrooms ORDER BY id LIMIT 1').get();
  const courseCode = `TEST-DUPLICATE-${Date.now()}`;
  const course = database.prepare(
    'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
  ).run(courseCode, 'Temporary Duplicate Course', teacher.id, classroom.id);
  database.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(student.user.id, course.lastInsertRowid);
  database.prepare(
    `INSERT INTO class_schedules
      (course_id, classroom_id, day_of_week, start_time, end_time, check_in_open_minutes_before, late_after_minutes, check_in_close_minutes_after)
     VALUES (?, ?, ?, '00:00', '23:59', 30, 15, 15)`,
  ).run(course.lastInsertRowid, classroom.id, getWeekdayName());

  const payload = {
    studentId: student.user.id,
    courseId: course.lastInsertRowid,
    classroomId: classroom.id,
    latitude: classroom.latitude,
    longitude: classroom.longitude,
    accuracy: 10,
  };

  try {
    const first = await request('/api/attendance/check-in', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify(payload),
    });
    assert.equal(first.status, 201);

    const second = await request('/api/attendance/check-in', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify(payload),
    });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'DUPLICATE_CHECK_IN');
  } finally {
    database.prepare('DELETE FROM attendance WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM enrollments WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM class_schedules WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM courses WHERE id = ?').run(course.lastInsertRowid);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(student.token) });
  }
});

test('teacher-controlled session flow gates student check-in', async () => {
  const teacher = await login('T001');
  const student = await login('65001');
  const classroom = database.prepare('SELECT id, latitude, longitude, radius FROM classrooms ORDER BY id LIMIT 1').get();
  const courseCode = `TEST-CONTROLLED-${Date.now()}`;
  const course = database.prepare(
    'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
  ).run(courseCode, 'Temporary Controlled Session Course', teacher.user.id, classroom.id);
  database.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(student.user.id, course.lastInsertRowid);

  const payload = {
    courseId: course.lastInsertRowid,
    classroomId: classroom.id,
    sessionDate: getSessionDate(),
    classStartTime: '00:00',
    classEndTime: '23:59',
    checkinOpenTime: '00:00',
    checkinCloseTime: '23:59',
    gpsRadius: classroom.radius,
  };

  try {
    const created = await request('/api/teacher/sessions', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify(payload),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.session.status, 'SCHEDULED');

    const duplicate = await request('/api/teacher/sessions', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify(payload),
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.code, 'DUPLICATE_SESSION');

    const teacherCourses = await request(`/api/teacher/courses?teacherId=${teacher.user.id}`, {
      headers: authHeaders(teacher.token),
    });
    assert.equal(teacherCourses.status, 200);
    const teacherCourseIds = teacherCourses.body.courses.map((course) => course.id);
    assert.equal(new Set(teacherCourseIds).size, teacherCourseIds.length);

    const notOpen = await request('/api/attendance/check-in', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify({
        studentId: student.user.id,
        courseId: course.lastInsertRowid,
        classroomId: classroom.id,
        sessionId: created.body.session.id,
        latitude: classroom.latitude,
        longitude: classroom.longitude,
        accuracy: 10,
      }),
    });
    assert.equal(notOpen.status, 409);
    assert.equal(notOpen.body.code, 'SESSION_NOT_OPEN');

    const opened = await request(`/api/teacher/sessions/${created.body.session.id}/open`, {
      method: 'POST',
      headers: authHeaders(teacher.token),
    });
    assert.equal(opened.status, 200);
    assert.equal(opened.body.session.status, 'OPEN');

    const openedCourses = await request(`/api/courses?studentId=${student.user.id}`, {
      headers: authHeaders(student.token),
    });
    const openedCourse = openedCourses.body.courses.find((courseRecord) => courseRecord.id === course.lastInsertRowid);
    assert.equal(openedCourse.sessionControlStatus, 'OPEN');
    assert.equal(openedCourse.sessionStatus, 'open');
    assert.equal(openedCourse.checkInAllowed, true);

    const checkedIn = await request('/api/attendance/check-in', {
      method: 'POST',
      headers: authHeaders(student.token),
      body: JSON.stringify({
        studentId: student.user.id,
        courseId: course.lastInsertRowid,
        classroomId: classroom.id,
        sessionId: created.body.session.id,
        latitude: classroom.latitude,
        longitude: classroom.longitude,
        accuracy: 10,
      }),
    });
    assert.equal(checkedIn.status, 201);

    const closed = await request(`/api/teacher/sessions/${created.body.session.id}/close`, {
      method: 'POST',
      headers: authHeaders(teacher.token),
    });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.session.status, 'CLOSED');

    const teacherSessions = await request(`/api/teacher/sessions?teacherId=${teacher.user.id}`, {
      headers: authHeaders(teacher.token),
    });
    assert.equal(teacherSessions.status, 200);
    assert.ok(teacherSessions.body.sessions.some((session) => session.id === created.body.session.id));

    const attendanceHistory = await request(`/api/teacher/sessions/${created.body.session.id}/attendance`, {
      headers: authHeaders(teacher.token),
    });
    assert.equal(attendanceHistory.status, 200);
    assert.equal(attendanceHistory.body.summary.totalStudents, 1);
    assert.equal(attendanceHistory.body.summary.presentCount + attendanceHistory.body.summary.lateCount, 1);
    assert.equal(attendanceHistory.body.students[0].userCode, student.user.userCode);

    const protectedDelete = await request(`/api/teacher/sessions/${created.body.session.id}`, {
      method: 'DELETE',
      headers: authHeaders(teacher.token),
    });
    assert.equal(protectedDelete.status, 409);
    assert.equal(protectedDelete.body.code, 'SESSION_HAS_ATTENDANCE');

    const studentHistory = await request(`/api/attendance/student/${student.user.id}`, {
      headers: authHeaders(student.token),
    });
    assert.equal(studentHistory.status, 200);
    assert.ok(studentHistory.body.records.some((record) => record.courseCode === courseCode && ['present', 'late'].includes(record.status)));
  } finally {
    database.prepare('DELETE FROM attendance WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM class_sessions WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM enrollments WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM courses WHERE id = ?').run(course.lastInsertRowid);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(student.token) });
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(teacher.token) });
  }
});

test('teacher can cancel and delete a session without attendance', async () => {
  const teacher = await login('T001');
  const classroom = database.prepare('SELECT id, radius FROM classrooms ORDER BY id LIMIT 1').get();
  const course = database.prepare(
    'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
  ).run(`TEST-DELETE-SESSION-${Date.now()}`, 'Temporary Deletable Session Course', teacher.user.id, classroom.id);
  const payload = {
    courseId: course.lastInsertRowid,
    classroomId: classroom.id,
    sessionDate: getSessionDate(),
    classStartTime: '01:00',
    classEndTime: '02:00',
    checkinOpenTime: '00:30',
    checkinCloseTime: '02:15',
    gpsRadius: classroom.radius,
  };

  try {
    const created = await request('/api/teacher/sessions', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify(payload),
    });
    assert.equal(created.status, 201);

    const cancelled = await request(`/api/teacher/sessions/${created.body.session.id}/cancel`, {
      method: 'POST',
      headers: authHeaders(teacher.token),
    });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.session.status, 'CANCELLED');

    const deleted = await request(`/api/teacher/sessions/${created.body.session.id}`, {
      method: 'DELETE',
      headers: authHeaders(teacher.token),
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.deletedSessionId, created.body.session.id);
  } finally {
    database.prepare('DELETE FROM class_sessions WHERE course_id = ?').run(course.lastInsertRowid);
    database.prepare('DELETE FROM courses WHERE id = ?').run(course.lastInsertRowid);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(teacher.token) });
  }
});

test('teacher can delete an unused classroom but protected classrooms cannot be deleted', async () => {
  const teacher = await login('T001');
  const roomName = `Temporary Room ${Date.now()}`;
  let classroomId;

  try {
    const created = await request('/api/classrooms', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify({
        roomName,
        latitude: 13.8001,
        longitude: 100.5001,
        radius: 40,
      }),
    });
    assert.equal(created.status, 201);
    classroomId = created.body.classroom.id;

    const deleted = await request(`/api/classrooms/${classroomId}`, {
      method: 'DELETE',
      headers: authHeaders(teacher.token),
    });
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.deletedClassroomId, classroomId);
    assert.equal(database.prepare('SELECT id FROM classrooms WHERE id = ?').get(classroomId), undefined);

    const referencedClassroom = database.prepare('SELECT classroom_id AS classroomId FROM courses WHERE classroom_id IS NOT NULL LIMIT 1').get();
    const blocked = await request(`/api/classrooms/${referencedClassroom.classroomId}`, {
      method: 'DELETE',
      headers: authHeaders(teacher.token),
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'CLASSROOM_IN_USE');
    assert.ok(blocked.body.references.courses > 0 || blocked.body.references.sessions > 0 || blocked.body.references.attendance > 0);
  } finally {
    if (classroomId) database.prepare('DELETE FROM classrooms WHERE id = ?').run(classroomId);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(teacher.token) });
  }
});

test('room settings propagate to scheduled sessions and student sees teacher-opened status', async () => {
  const teacher = await login('T001');
  const student = await login('65001');
  const roomName = `Propagation Room ${Date.now()}`;
  let classroomId;
  let courseId;

  try {
    const createdRoom = await request('/api/classrooms', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify({ roomName, latitude: 13.801, longitude: 100.501, radius: 40 }),
    });
    assert.equal(createdRoom.status, 201);
    classroomId = createdRoom.body.classroom.id;

    const course = database.prepare(
      'INSERT INTO courses (course_code, course_name, teacher_id, classroom_id) VALUES (?, ?, ?, ?)',
    ).run(`PROPAGATION-${Date.now()}`, 'Propagation Test Course', teacher.user.id, classroomId);
    courseId = Number(course.lastInsertRowid);
    database.prepare('INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)').run(student.user.id, courseId);

    const createdSession = await request('/api/teacher/sessions', {
      method: 'POST',
      headers: authHeaders(teacher.token),
      body: JSON.stringify({
        courseId,
        classroomId,
        sessionDate: getSessionDate(),
        classStartTime: '23:00',
        classEndTime: '23:59',
        checkinOpenTime: '00:00',
        checkinCloseTime: '23:59',
        gpsRadius: 40,
      }),
    });
    assert.equal(createdSession.status, 201);
    const sessionId = createdSession.body.session.id;

    const updatedRoom = await request(`/api/classrooms/${classroomId}`, {
      method: 'PUT',
      headers: authHeaders(teacher.token),
      body: JSON.stringify({ roomName, latitude: 13.801, longitude: 100.501, radius: 75 }),
    });
    assert.equal(updatedRoom.status, 200);

    const sessions = await request(`/api/teacher/sessions?teacherId=${teacher.user.id}`, {
      headers: authHeaders(teacher.token),
    });
    const propagated = sessions.body.sessions.find((session) => session.id === sessionId);
    assert.equal(propagated.gpsRadius, 75);

    const opened = await request(`/api/teacher/sessions/${sessionId}/open`, {
      method: 'POST',
      headers: authHeaders(teacher.token),
    });
    assert.equal(opened.status, 200);

    const studentCourses = await request(`/api/courses?studentId=${student.user.id}`, {
      headers: authHeaders(student.token),
    });
    const studentCourse = studentCourses.body.courses.find((courseRecord) => courseRecord.id === courseId);
    assert.equal(studentCourse.sessionControlStatus, 'OPEN');
    assert.equal(studentCourse.sessionStatus, 'open');
    assert.equal(studentCourse.checkInAllowed, true);
  } finally {
    if (courseId) {
      database.prepare('DELETE FROM attendance WHERE course_id = ?').run(courseId);
      database.prepare('DELETE FROM class_sessions WHERE course_id = ?').run(courseId);
      database.prepare('DELETE FROM enrollments WHERE course_id = ?').run(courseId);
      database.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    }
    if (classroomId) database.prepare('DELETE FROM classrooms WHERE id = ?').run(classroomId);
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(student.token) });
    await request('/api/auth/logout', { method: 'POST', headers: authHeaders(teacher.token) });
  }
});
