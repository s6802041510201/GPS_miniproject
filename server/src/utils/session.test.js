const assert = require('node:assert/strict');
const test = require('node:test');
const { getSessionDetails } = require('./session');
const { getControlledSessionDetails } = require('./session');

const schedule = {
  dayOfWeek: 'Tuesday',
  startTime: '08:30',
  endTime: '12:00',
  openMinutesBefore: 30,
  lateAfterMinutes: 15,
  closeMinutesAfter: 15,
};

test('session status exposes open, on-time, late, and close windows', () => {
  const upcoming = getSessionDetails(schedule, new Date('2026-09-15T00:45:00.000Z'));
  assert.equal(upcoming.sessionStatus, 'upcoming');
  assert.equal(upcoming.checkInAllowed, false);
  assert.equal(upcoming.checkInOpenTime, '08:00');

  const onTime = getSessionDetails(schedule, new Date('2026-09-15T01:10:00.000Z'));
  assert.equal(onTime.sessionStatus, 'open');
  assert.equal(onTime.onTimeAllowed, true);

  const late = getSessionDetails(schedule, new Date('2026-09-15T02:00:00.000Z'));
  assert.equal(late.sessionStatus, 'late');
  assert.equal(late.checkInAllowed, true);
  assert.equal(late.onTimeAllowed, false);

  const closed = getSessionDetails(schedule, new Date('2026-09-15T05:16:00.000Z'));
  assert.equal(closed.sessionStatus, 'closed');
  assert.equal(closed.checkInAllowed, false);
});

test('session details identify a course that is not scheduled today', () => {
  const result = getSessionDetails({ ...schedule, dayOfWeek: 'Wednesday' }, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(result.isToday, false);
  assert.equal(result.sessionStatus, 'not_today');
  assert.equal(result.checkInAllowed, false);
});

test('session details never allow check-in when no schedule exists', () => {
  const result = getSessionDetails(null, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(result.sessionStatus, 'not_scheduled');
  assert.equal(result.checkInAllowed, false);
  assert.equal(result.onTimeAllowed, false);
});

test('teacher-controlled sessions require OPEN status before check-in', () => {
  const base = {
    sessionDate: '2026-09-15',
    classStartTime: '08:30',
    classEndTime: '12:00',
    checkinOpenTime: '08:00',
    checkinCloseTime: '12:15',
  };

  const scheduled = getControlledSessionDetails({ ...base, status: 'SCHEDULED' }, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(scheduled.sessionStatus, 'scheduled');
  assert.equal(scheduled.checkInAllowed, false);

  const open = getControlledSessionDetails({ ...base, status: 'OPEN' }, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(open.sessionStatus, 'open');
  assert.equal(open.checkInAllowed, true);
  assert.equal(open.onTimeAllowed, true);

  const closed = getControlledSessionDetails({ ...base, status: 'CLOSED' }, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(closed.sessionStatus, 'closed_by_teacher');
  assert.equal(closed.checkInAllowed, false);

  const cancelled = getControlledSessionDetails({ ...base, status: 'CANCELLED' }, new Date('2026-09-15T01:00:00.000Z'));
  assert.equal(cancelled.sessionStatus, 'cancelled');
  assert.equal(cancelled.checkInAllowed, false);
});

test('controlled session status takes priority over attendance status in joined course rows', () => {
  const result = getControlledSessionDetails({
    sessionDate: '2026-09-15',
    classStartTime: '08:30',
    classEndTime: '12:00',
    checkinOpenTime: '08:00',
    checkinCloseTime: '12:15',
    sessionControlStatus: 'OPEN',
    status: 'present',
  }, new Date('2026-09-15T01:00:00.000Z'));

  assert.equal(result.sessionControlStatus, 'OPEN');
  assert.equal(result.sessionStatus, 'open');
  assert.equal(result.checkInAllowed, true);
});
