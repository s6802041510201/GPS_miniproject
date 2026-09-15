const assert = require('node:assert/strict');
const test = require('node:test');
const { getSessionDetails } = require('./session');

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
