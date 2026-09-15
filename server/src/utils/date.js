function getSessionDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getWeekdayName(value = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.APP_TIMEZONE || 'Asia/Bangkok',
    weekday: 'long',
  }).format(value);
}

module.exports = { getSessionDate, getWeekdayName };
