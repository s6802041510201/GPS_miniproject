const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { hashPassword } = require('../utils/auth');
const { getSessionDate, getWeekdayName } = require('../utils/date');

const dataDirectory = path.join(__dirname, '../../data');
const databasePath = path.join(dataDirectory, 'geo-attendance.db');

fs.mkdirSync(dataDirectory, { recursive: true });

const database = new Database(databasePath);
database.pragma('journal_mode = WAL');

function hasColumn(tableName, columnName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName);
}

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    teacher_id INTEGER NOT NULL REFERENCES users(id),
    classroom_id INTEGER REFERENCES classrooms(id)
  );

  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_code TEXT NOT NULL UNIQUE,
    building_name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius REAL NOT NULL CHECK (radius > 0)
  );

  CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius REAL NOT NULL CHECK (radius > 0),
    building_id INTEGER REFERENCES buildings(id),
    room_number TEXT,
    capacity INTEGER NOT NULL DEFAULT 60
  );

  CREATE TABLE IF NOT EXISTS class_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL REFERENCES courses(id),
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    check_in_open_minutes_before INTEGER NOT NULL DEFAULT 30,
    late_after_minutes INTEGER NOT NULL DEFAULT 15,
    check_in_close_minutes_after INTEGER NOT NULL DEFAULT 15,
    UNIQUE(course_id, day_of_week, start_time)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    UNIQUE(student_id, course_id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    distance REAL NOT NULL,
    session_date TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
    UNIQUE(student_id, course_id, session_date)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
`);

// Keep existing demo databases upgradeable without deleting local attendance data.
if (!hasColumn('users', 'password_hash')) database.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
if (!hasColumn('courses', 'classroom_id')) database.exec('ALTER TABLE courses ADD COLUMN classroom_id INTEGER REFERENCES classrooms(id)');
if (!hasColumn('classrooms', 'building_id')) database.exec('ALTER TABLE classrooms ADD COLUMN building_id INTEGER REFERENCES buildings(id)');
if (!hasColumn('classrooms', 'room_number')) database.exec('ALTER TABLE classrooms ADD COLUMN room_number TEXT');
if (!hasColumn('classrooms', 'capacity')) database.exec('ALTER TABLE classrooms ADD COLUMN capacity INTEGER NOT NULL DEFAULT 60');
if (!hasColumn('class_schedules', 'check_in_open_minutes_before')) database.exec('ALTER TABLE class_schedules ADD COLUMN check_in_open_minutes_before INTEGER NOT NULL DEFAULT 30');
if (!hasColumn('class_schedules', 'late_after_minutes')) database.exec('ALTER TABLE class_schedules ADD COLUMN late_after_minutes INTEGER NOT NULL DEFAULT 15');
if (!hasColumn('class_schedules', 'check_in_close_minutes_after')) database.exec('ALTER TABLE class_schedules ADD COLUMN check_in_close_minutes_after INTEGER NOT NULL DEFAULT 15');

const collapseDuplicateData = database.transaction(() => {
  const duplicateCourses = database
    .prepare(`
      SELECT teacher_id AS teacherId, course_name AS courseName, MIN(id) AS keepId, GROUP_CONCAT(id) AS ids
      FROM courses
      GROUP BY teacher_id, course_name
      HAVING COUNT(*) > 1
    `)
    .all();

  for (const duplicate of duplicateCourses) {
    const duplicateIds = duplicate.ids
      .split(',')
      .map(Number)
      .filter((id) => id !== duplicate.keepId);

    for (const duplicateId of duplicateIds) {
      database.prepare('UPDATE enrollments SET course_id = ? WHERE course_id = ?').run(duplicate.keepId, duplicateId);
      database.prepare('UPDATE attendance SET course_id = ? WHERE course_id = ?').run(duplicate.keepId, duplicateId);
      database.prepare('DELETE FROM courses WHERE id = ?').run(duplicateId);
    }
  }

  const duplicateClassrooms = database
    .prepare(`
      SELECT room_name AS roomName, MIN(id) AS keepId, GROUP_CONCAT(id) AS ids
      FROM classrooms
      GROUP BY room_name
      HAVING COUNT(*) > 1
    `)
    .all();

  for (const duplicate of duplicateClassrooms) {
    const duplicateIds = duplicate.ids
      .split(',')
      .map(Number)
      .filter((id) => id !== duplicate.keepId);

    for (const duplicateId of duplicateIds) {
      database.prepare('UPDATE attendance SET classroom_id = ? WHERE classroom_id = ?').run(duplicate.keepId, duplicateId);
      database.prepare('DELETE FROM classrooms WHERE id = ?').run(duplicateId);
    }
  }
});

collapseDuplicateData();
database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_teacher_name
  ON courses (teacher_id, course_name);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_classrooms_room_name
  ON classrooms (room_name);
`);

const seedUser = database.prepare(`
  INSERT OR IGNORE INTO users (user_code, name, email, password, password_hash, role)
  VALUES (@userCode, @name, @email, '', @passwordHash, @role)
`);

seedUser.run({
  userCode: 'T001',
  name: 'Demo Teacher',
  email: 'teacher@geo-attendance.test',
  passwordHash: hashPassword('123456'),
  role: 'teacher',
});

const demoStudents = [
  { userCode: '65001', name: 'Demo Student', email: '65001@geo-attendance.test' },
  { userCode: '65002', name: 'Alex Morgan', email: '65002@geo-attendance.test' },
  { userCode: '65003', name: 'Jamie Lee', email: '65003@geo-attendance.test' },
  { userCode: '65004', name: 'Taylor Kim', email: '65004@geo-attendance.test' },
  { userCode: '65005', name: 'Jordan Patel', email: '65005@geo-attendance.test' },
  { userCode: '65006', name: 'Casey Brown', email: '65006@geo-attendance.test' },
];

for (const demoStudent of demoStudents) {
  seedUser.run({
    ...demoStudent,
    passwordHash: hashPassword('123456'),
    role: 'student',
  });
}

// Upgrade legacy local demo rows that stored a plaintext password.
const legacyUsers = database
  .prepare('SELECT id, password FROM users WHERE password_hash IS NULL OR password_hash = ?')
  .all('');
for (const legacyUser of legacyUsers) {
  database
    .prepare('UPDATE users SET password = ?, password_hash = ? WHERE id = ?')
    .run('', hashPassword(legacyUser.password || '123456'), legacyUser.id);
}

const teacher = database
  .prepare('SELECT id FROM users WHERE user_code = ?')
  .get('T001');

const seedBuilding = database.prepare(`
  INSERT OR IGNORE INTO buildings (building_code, building_name, address, latitude, longitude, radius)
  VALUES (@buildingCode, @buildingName, @address, @latitude, @longitude, @radius)
`);

seedBuilding.run({
  buildingCode: '44',
  buildingName: 'Faculty of Science and Applied Technology',
  address: '1518 Pracharat Sai 1, Wong Sawang, Bang Sue, Bangkok 10800',
  latitude: 13.8138,
  longitude: 100.5334,
  radius: 50,
});
seedBuilding.run({
  buildingCode: '52',
  buildingName: 'Faculty of Technical Education and Industrial Technology',
  address: '1518 Pracharat Sai 1, Wong Sawang, Bang Sue, Bangkok 10800',
  latitude: 13.8147,
  longitude: 100.5358,
  radius: 50,
});

const building44 = database.prepare('SELECT id FROM buildings WHERE building_code = ?').get('44');
const building52 = database.prepare('SELECT id FROM buildings WHERE building_code = ?').get('52');

function ensureClassroom({ roomName, roomNumber, buildingId, latitude, longitude }) {
  let classroom = database.prepare('SELECT id, room_name AS roomName FROM classrooms WHERE room_name = ?').get(roomName);
  if (!classroom) {
    classroom = database
      .prepare('SELECT id, room_name AS roomName FROM classrooms WHERE building_id = ? AND room_number = ?')
      .get(buildingId, roomNumber);
  }
  if (!classroom) {
    const result = database
      .prepare(`
        INSERT INTO classrooms (room_name, latitude, longitude, radius, building_id, room_number, capacity)
        VALUES (?, ?, ?, 50, ?, ?, 60)
      `)
      .run(roomName, latitude, longitude, buildingId, roomNumber);
    classroom = { id: result.lastInsertRowid };
  } else {
    database
      .prepare(`
        UPDATE classrooms
        SET latitude = ?, longitude = ?, radius = 50, building_id = ?, room_number = ?, capacity = 60
        WHERE id = ?
      `)
      .run(latitude, longitude, buildingId, roomNumber, classroom.id);
  }
  return database.prepare('SELECT id FROM classrooms WHERE id = ?').get(classroom.id);
}

const room4401 = ensureClassroom({
  roomName: 'Room 4401',
  roomNumber: '4401',
  buildingId: building44.id,
  latitude: 13.8138,
  longitude: 100.5334,
});
const room5201 = ensureClassroom({
  roomName: 'Room 5201',
  roomNumber: '5201',
  buildingId: building52.id,
  latitude: 13.8147,
  longitude: 100.5358,
});

// Migrate the original demo room to the production building set while preserving attendance records.
const legacyRoom = database.prepare('SELECT id FROM classrooms WHERE room_name = ?').get('Room 701');
if (legacyRoom && legacyRoom.id !== room5201.id) {
  database.transaction(() => {
    database.prepare('UPDATE attendance SET classroom_id = ? WHERE classroom_id = ?').run(room5201.id, legacyRoom.id);
    database.prepare('DELETE FROM classrooms WHERE id = ?').run(legacyRoom.id);
  })();
}

function ensureCourse(courseCode, courseName, classroomId) {
  let currentCourse = database.prepare('SELECT id FROM courses WHERE course_code = ?').get(courseCode);
  if (!currentCourse) {
    const result = database
      .prepare(`
        INSERT INTO courses (course_code, course_name, teacher_id, classroom_id)
        VALUES (?, ?, ?, ?)
      `)
      .run(courseCode, courseName, teacher.id, classroomId);
    currentCourse = { id: result.lastInsertRowid };
  }
  database
    .prepare('UPDATE courses SET course_name = ?, teacher_id = ?, classroom_id = ? WHERE id = ?')
    .run(courseName, teacher.id, classroomId, currentCourse.id);
  return currentCourse;
}

const course = ensureCourse('040613101', 'Mobile Application', room5201.id);
const secondCourse = ensureCourse('040613102', 'Data Structure', room4401.id);

function ensureSchedule(courseId, classroomId, dayOfWeek, startTime, endTime) {
  const existing = database.prepare('SELECT id FROM class_schedules WHERE course_id = ? ORDER BY id LIMIT 1').get(courseId);
  if (existing) {
    database
      .prepare(`
        UPDATE class_schedules
        SET classroom_id = ?, day_of_week = ?, start_time = ?, end_time = ?,
            check_in_open_minutes_before = 30, late_after_minutes = 15, check_in_close_minutes_after = 15
        WHERE id = ?
      `)
      .run(classroomId, dayOfWeek, startTime, endTime, existing.id);
    return;
  }

  database
    .prepare(`
      INSERT INTO class_schedules
        (course_id, classroom_id, day_of_week, start_time, end_time, check_in_open_minutes_before, late_after_minutes, check_in_close_minutes_after)
      VALUES (?, ?, ?, ?, ?, 30, 15, 15)
    `)
    .run(courseId, classroomId, dayOfWeek, startTime, endTime);
}

ensureSchedule(course.id, room5201.id, getWeekdayName(), '08:30', '12:00');
ensureSchedule(secondCourse.id, room4401.id, 'Wednesday', '13:00', '16:00');

// Consolidate rooms that represent the same building and room number.
// Prefer the record already referenced by a course, schedule, or attendance row.
const duplicateRooms = database
  .prepare(`
    SELECT building_id AS buildingId, room_number AS roomNumber, GROUP_CONCAT(id) AS ids
    FROM classrooms
    WHERE building_id IS NOT NULL AND room_number IS NOT NULL
    GROUP BY building_id, room_number
    HAVING COUNT(*) > 1
  `)
  .all();

for (const duplicate of duplicateRooms) {
  const ids = duplicate.ids.split(',').map(Number);
  const referenced = database
    .prepare(`
      SELECT id FROM classrooms
      WHERE id IN (${ids.map(() => '?').join(',')})
      AND (
        EXISTS (SELECT 1 FROM courses WHERE courses.classroom_id = classrooms.id)
        OR EXISTS (SELECT 1 FROM class_schedules WHERE class_schedules.classroom_id = classrooms.id)
        OR EXISTS (SELECT 1 FROM attendance WHERE attendance.classroom_id = classrooms.id)
      )
      ORDER BY id
      LIMIT 1
    `)
    .get(...ids);
  const keepId = referenced?.id ?? Math.min(...ids);

  for (const duplicateId of ids.filter((id) => id !== keepId)) {
    database.transaction(() => {
      database.prepare('UPDATE courses SET classroom_id = ? WHERE classroom_id = ?').run(keepId, duplicateId);
      database.prepare('UPDATE class_schedules SET classroom_id = ? WHERE classroom_id = ?').run(keepId, duplicateId);
      database.prepare('UPDATE attendance SET classroom_id = ? WHERE classroom_id = ?').run(keepId, duplicateId);
      database.prepare('DELETE FROM classrooms WHERE id = ?').run(duplicateId);
    })();
  }
}

database.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_classrooms_building_room
  ON classrooms (building_id, room_number)
  WHERE building_id IS NOT NULL AND room_number IS NOT NULL;
`);

const studentIds = database
  .prepare('SELECT id, user_code AS userCode FROM users WHERE role = ? ORDER BY user_code')
  .all('student');

const enrollStudent = database.prepare(`
  INSERT OR IGNORE INTO enrollments (student_id, course_id)
  VALUES (?, ?)
`);

for (const studentRecord of studentIds) {
  enrollStudent.run(studentRecord.id, course.id);
  enrollStudent.run(studentRecord.id, secondCourse.id);
}

const demoSessionDate = getSessionDate();
const attendanceCount = database
  .prepare('SELECT COUNT(*) AS count FROM attendance WHERE course_id = ? AND session_date = ?')
  .get(course.id, demoSessionDate);

if (attendanceCount.count === 0) {
  const demoAttendance = [
    { userCode: '65002', status: 'present', latitude: 13.81471, longitude: 100.53581, accuracy: 12, distance: 1, time: '08:36:00.000Z' },
    { userCode: '65003', status: 'present', latitude: 13.81470, longitude: 100.53582, accuracy: 18, distance: 3, time: '08:41:00.000Z' },
    { userCode: '65004', status: 'late', latitude: 13.81485, longitude: 100.53595, accuracy: 22, distance: 21, time: '09:12:00.000Z' },
    { userCode: '65005', status: 'present', latitude: 13.81468, longitude: 100.53576, accuracy: 10, distance: 7, time: '08:48:00.000Z' },
  ];

  const insertAttendance = database.prepare(`
    INSERT OR IGNORE INTO attendance
      (student_id, course_id, classroom_id, latitude, longitude, accuracy, distance, session_date, check_in_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const demoRecord of demoAttendance) {
    const studentRecord = studentIds.find((candidate) => candidate.userCode === demoRecord.userCode);
    if (!studentRecord) continue;

    insertAttendance.run(
      studentRecord.id,
      course.id,
      room5201.id,
      demoRecord.latitude,
      demoRecord.longitude,
      demoRecord.accuracy,
      demoRecord.distance,
      demoSessionDate,
      new Date(`${demoSessionDate}T${demoRecord.time}`).toISOString(),
      demoRecord.status,
    );
  }
}

function checkDatabaseConnection() {
  const result = database.prepare('SELECT 1 AS connected').get();
  return result.connected === 1;
}

module.exports = {
  database,
  databasePath,
  checkDatabaseConnection,
};
