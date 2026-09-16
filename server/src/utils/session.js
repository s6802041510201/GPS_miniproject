const { getSessionDate, getWeekdayName } = require('./date');

function toLocalDate(sessionDate, time) {
  const offset = process.env.APP_TIMEZONE_OFFSET || '+07:00';
  return new Date(`${sessionDate}T${time}:00${offset}`);
}

function formatLocalTime(value) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(value);
}

function getSessionDetails(schedule, now = new Date()) {
  if (!schedule?.dayOfWeek || !schedule.startTime || !schedule.endTime) {
    return {
      isToday: false,
      sessionStatus: 'not_scheduled',
      checkInAllowed: false,
      onTimeAllowed: false,
      checkInOpenTime: null,
      onTimeUntil: null,
      checkInCloseTime: null,
    };
  }

  const isToday = schedule.dayOfWeek === getWeekdayName(now);
  const sessionDate = getSessionDate(now);
  const start = toLocalDate(sessionDate, schedule.startTime);
  const end = toLocalDate(sessionDate, schedule.endTime);
  const open = new Date(start.getTime() - Number(schedule.openMinutesBefore ?? 30) * 60 * 1000);
  const onTimeUntil = new Date(start.getTime() + Number(schedule.lateAfterMinutes ?? 15) * 60 * 1000);
  const close = new Date(end.getTime() + Number(schedule.closeMinutesAfter ?? 15) * 60 * 1000);

  let sessionStatus = 'not_today';
  if (isToday) {
    if (now < open) sessionStatus = 'upcoming';
    else if (now <= onTimeUntil) sessionStatus = 'open';
    else if (now <= close) sessionStatus = 'late';
    else sessionStatus = 'closed';
  }

  return {
    isToday,
    sessionStatus,
    checkInAllowed: isToday && now >= open && now <= close,
    onTimeAllowed: isToday && now >= open && now <= onTimeUntil,
    checkInOpenTime: formatLocalTime(open),
    onTimeUntil: formatLocalTime(onTimeUntil),
    checkInCloseTime: formatLocalTime(close),
  };
}

function getControlledSessionDetails(session, now = new Date()) {
  if (!session?.sessionDate || !session.classStartTime || !session.classEndTime || !session.checkinOpenTime || !session.checkinCloseTime) {
    return {
      isToday: false,
      sessionStatus: 'not_scheduled',
      sessionControlStatus: session?.sessionControlStatus ?? session?.status ?? null,
      checkInAllowed: false,
      onTimeAllowed: false,
      checkInOpenTime: null,
      onTimeUntil: null,
      checkInCloseTime: null,
    };
  }

  const isToday = session.sessionDate === getSessionDate(now);
  const start = toLocalDate(session.sessionDate, session.classStartTime);
  const open = toLocalDate(session.sessionDate, session.checkinOpenTime);
  const close = toLocalDate(session.sessionDate, session.checkinCloseTime);
  // Course queries expose the database value as sessionControlStatus because
  // attendance.status is also present in the same row. Prefer the explicit
  // controlled-session field so an attendance result cannot overwrite it.
  const sessionStatus = String(session.sessionControlStatus ?? session.status ?? 'SCHEDULED').toUpperCase();

  let effectiveStatus = 'not_today';
  if (isToday) {
    if (sessionStatus === 'CANCELLED') effectiveStatus = 'cancelled';
    else if (sessionStatus === 'CLOSED') effectiveStatus = 'closed_by_teacher';
    else if (sessionStatus === 'OPEN' && now <= close) effectiveStatus = 'open';
    else if (sessionStatus === 'OPEN' && now > close) effectiveStatus = 'closed';
    else if (now < open) effectiveStatus = 'upcoming';
    else if (now > close) effectiveStatus = 'closed';
    else effectiveStatus = 'scheduled';
  }

  return {
    isToday,
    sessionStatus: effectiveStatus,
    sessionControlStatus: sessionStatus,
    checkInAllowed: isToday && sessionStatus === 'OPEN' && now <= close,
    onTimeAllowed: isToday && sessionStatus === 'OPEN' && now <= start,
    checkInOpenTime: formatLocalTime(open),
    onTimeUntil: formatLocalTime(start),
    checkInCloseTime: formatLocalTime(close),
  };
}

module.exports = { getControlledSessionDetails, getSessionDetails };
